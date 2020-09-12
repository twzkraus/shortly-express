const models = require('../models');
const Promise = require('bluebird');

module.exports.createSession = (req, res, next) => {
  if (req.cookies) {
  models.Sessions.get({hash: req.cookies.shortlyid})
    // valid id: get will return an object
    .then((sessionData) => {
      // not valid: get will return undefined
      if (!sessionData) {
        // this previously contained the .catch block information, but throwing an error should route that there anyway
        throw Error();
      } else {
        // sessionData includes user id, hash, primary id
        req.session = sessionData;
        next(req, res);
        return;
      }
    })
    .catch( () => {
      return models.Sessions.create()
        .then(session => {
          return models.Sessions.get({id: session.insertId})
        })
        .then(data => {
          req.session = {hash: data.hash};
          res.cookies = res.cookies || {};
          res.cookies['shortlyid'] = {value: data.hash};
          next(req, res);
        })
    });
  } else {
    models.Sessions.create()
      .then(session => {
        return models.Sessions.get({id: session.insertId})
      })
      .then(data => {
        req.session = {hash: data.hash};
        res.cookies = {};
        res.cookies['shortlyid'] = {value: data.hash};
        next(req, res);
      })
  }
};

/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/
