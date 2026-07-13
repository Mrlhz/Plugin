
import Dexie from 'dexie';

// 1. 创建自愈抓取专属的本地数据库实例
export const db = new Dexie('DouyinGrabberDB');

// 2. 定义高度索引化的表结构（只定义主键和需要检索的字段）
db.version(1).stores({
  // aweme_id: 抖音视频唯一标识作为主键
  // author_id: 方便以后按作者筛选查看
  // status: 记录‘pushed’(排队中)、‘completed’(下载完成)、‘failed’(彻底失败)
  // create_time: 方便后续按时间线清理过期缓存数据
  // media_pool: 'aweme_id, type, createTime, author_id, status, [type+createTime]'
  media_pool: [
    'aweme_id',                // 主键
    'type',                    // 单字段索引
    'status',                  // 单字段索引
    'author_id',               // 单字段索引
    'create_time',             // 单字段索引
    '[type+create_time]',      // 复合索引：按类型+时间筛选/排序
    '[author_id+create_time]', // 新增复合索引：按作者+时间筛选/排序
    '[status+create_time]'     // 新增复合索引：按状态+时间筛选/排序（用于下载队列排序）
  ].join(', '),

  // 新增：作者信息维护表
    // author_id: 作者唯一标识，作为主键（天然去重）
    // sec_uid: 抖音官方的作者唯一标识，方便后续与抖音官方数据对接
    // nickname: 方便前端展示作者昵称
    // sync_status: 记录该作者的抓取状态（如：'active' 激活、'paused' 暂停）
    // tags: 方便后续给作者打标签，做分组管理
    // last_grab_time: 该作者最近一次被抓取的时间（用于按顺序轮询抓取）
    author_profile: [
      'author_id',       // 主键
      'sec_uid',         // 单字段索引
      'nickname',        // 单字段索引
      'sync_status',     // 单字段索引
      'tags',            // 单字段索引
      'last_grab_time'   // 单字段索引
    ].join(', ')
});

/**
 * 👑 核心：安全的批量持久化入库函数（全面自愈增量保护版）
 * @param {Array<Object>} items - 采集到的抖音原始数据数组
 */
export async function saveCapturedItemsToDB(items) {
  if (!items || items.length === 0) return 0;
  
  const now = Date.now();
  
  // 1. 构造视频流水数据 (media_pool)
  const mediaRecords = items.map(item => ({
    aweme_id: item.aweme_id,
    author_id: item.author?.uid || 'unknown',
    author_name: item.author?.nickname || '未知作者', // 统一使用新字段 nickname 对齐
    desc: item.desc || '',
    type: item.type, // 'video' | 'note'
    raw: JSON.parse(JSON.stringify(item)), 
    status: 'pushed', 
    create_time: now
  }));

  // 2. 从本次采集到的数据中，提炼出【内存去重】后的最新作者映射表
  const authorMap = new Map();
  items.forEach(item => {
    const authorId = item.author?.uid || 'unknown';
    if (authorId !== 'unknown') {
      authorMap.set(authorId, {
        author_id: authorId,
        sec_uid: item.author?.sec_uid || '', // 尝试捕获原始接口返回的 sec_uid
        nickname: item.author?.nickname || '未知作者'
      });
    }
  });

  try {
    // 3. 开启高性能读写事务，级联写入
    await db.transaction('rw', [db.media_pool, db.author_profile], async () => {
      
      // 视频流水不存在覆盖破坏问题，直接使用批量覆盖物理写入，速度极快
      await db.media_pool.bulkPut(mediaRecords);
      
      // 4. 👑 核心自愈保护：对提炼出的作者逐一进行安全差异化写入
      for (const [authorId, freshAuthor] of authorMap.entries()) {
        const existingProfile = await db.author_profile.get(authorId);
        
        if (existingProfile) {
          // 👉 场景 A：如果该作者在档案中已存在，采用 update 进行【非破坏性增量补丁】
          // 绝对不传入 tags 字段，防止已有标签被清空
          await db.author_profile.update(authorId, {
            // 如果用户之前没维护过 sec_uid，则尝试用这次新采集到的填补；如果已经维护过了，锁死不变
            sec_uid: existingProfile.sec_uid || freshAuthor.sec_uid || '',
            nickname: freshAuthor.nickname, // 抓取到的最新昵称可以覆盖
            last_grab_time: now             // 刷新最近活跃时间
          });
        } else {
          // 👉 场景 B：如果是新发现的未知作者，进行【全量初始化】
          await db.author_profile.add({
            author_id: authorId,
            sec_uid: freshAuthor.sec_uid || '', // 尽量拉取初始 sec_uid
            nickname: freshAuthor.nickname,
            sync_status: 'active',
            tags: [], // 初始化为空数组，防止之后修改时发生 DataCloneError
            last_grab_time: now
          });
        }
      }
    });

    console.log(`[DexieDB] 安全入库完成：物理持久化 ${mediaRecords.length} 条作品流水，安全合并 ${authorMap.size} 位作者状态。`);
    return mediaRecords.length;
  } catch (error) {
    console.log('[DexieDB] 批量增量入库发生致命异常:', error);
    throw error;
  }
}