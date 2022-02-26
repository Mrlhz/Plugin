// http://localhost:3005/avmoo/avatar?type=star
axios.get('http://localhost:3005/avmoo/avatar', {
    params: {
      type: 'star'
    }
  })
  .then(function (response) {
    // handle success
    console.log(response)
  })
  .catch(function (error) {
    // handle error
    console.log(error)
  })
  .then(function () {
    // always executed
  })