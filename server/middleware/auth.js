const models = require('../models');
const Promise = require('bluebird');

module.exports.createSession = (req, res, next) => {
  console.log('inside of createSession');
  models.Sessions.get({hash: req.cookies.shortlyid})
    // valid id: get will return an object
    .then((sessionData) => {
      // not valid: get will return undefined
      if (!sessionData) {
        console.log('no session data was found');
        let sessionHash = models.Sessions.create().then( data => { return data.hash; } );
        req.session = { shortlyid: sessionHash };
      } else {
        console.log('session data was found');
        // sessionData includes user id, hash, primary id
        // use user id to log that person in
      }
    });
  next();
};

/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/

