const express = require('express');
const path = require('path');
const utils = require('./lib/hashUtils');
const partials = require('express-partials');
const bodyParser = require('body-parser');
const Auth = require('./middleware/auth');
const cookieParser = require('./middleware/cookieParser');
const models = require('./models');

const app = express();

app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');
app.use(partials());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));



app.get('/',
(req, res) => {
    assignSession(req, res, (r) => {
      Auth.verifySession(req, res, () => {
        r.render('index');
    });
  });
});

app.get('/create',
(req, res) => {
  assignSession(req, res, (r) => {
    Auth.verifySession(req, res, () => {
      r.render('index');
    });
  });
});

app.get('/links',
(req, res, next) => {
  assignSession(req, res, (r) => {
    Auth.verifySession(req, res, () => {
      models.Links.getAll()
        .then(links => {
          res.status(200).send(links);
        })
        .error(error => {
          res.status(500).send(error);
        });
      });
    });
});

app.post('/links',
(req, res, next) => {
  var url = req.body.url;
  if (!models.Links.isValidUrl(url)) {
    // send back a 404 if link is not valid
    return res.sendStatus(404);
  }

  return models.Links.get({ url })
    .then(link => {
      if (link) {
        throw link;
      }
      return models.Links.getUrlTitle(url);
    })
    .then(title => {
      return models.Links.create({
        url: url,
        title: title,
        baseUrl: req.headers.origin
      });
    })
    .then(results => {
      return models.Links.get({ id: results.insertId });
    })
    .then(link => {
      throw link;
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(link => {
      res.status(200).send(link);
    });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/signup', (req, res) => {
  res.render('signup');
});

app.post('/login',
(req, res, next) => {
  models.Users.get({username: req.body.username})
    .then( (userEntry) => {
      if (userEntry) {
        return models.Users.compare(req.body.password, userEntry.password, userEntry.salt);
      } else {
        res.redirect(401, '/login');
        throw Error('This user does not exist');
      }
    })
    .then((passwordIsCorrect) => {
      if (!passwordIsCorrect) {
        res.redirect(401, '/login');
        throw Error('This user and password don\'t match');
      } else {
        // create a session for the user
        assignSession(req, res, (r) => {
          r.redirect(201, '/');
        });
      }
    })
    .catch(err => {});
});

app.post('/signup',
(req, res, next) => {
  // req.body has username and password properties
  // use get to check if username exists
  models.Users.get({username: req.body.username})
  // if yes: redirect to signup
    .then( (result) => {
      if (result) {
        res.redirect('/signup');
      } else {
        models.Users.create({
          username: req.body.username,
          password: req.body.password
        });
        assignSession(req, res, (r) => {
          debugger;
          let userHash = r.cookies['shortlyid'].value;
          models.Users.get({username: req.body.username})
          .then( (result) => {
            models.Sessions.update({hash: userHash},
              {hash: userHash, userId: result.id})
          })
          r.render('index');
          // need to use hash from assignSession and user id from ? to update sessions table--lookup session with hash value, add userId
        });
      }
    });
});

app.get('/logout', (req, res, next) => {
  cookieParser(req, res, (req1, res1) => {
    // delete session
    return models.Sessions.delete({ hash: req1.cookies.shortlyid })
    .then( () => {
      // destroy cookie
      res1.clearCookie('shortlyid');
      next();
      });
  });
})

var assignSession = function (req, res, cb) {
  cookieParser(req, res, (req2, res2) => {
    Auth.createSession(req2, res2, (req3, res3) => {
      res.cookie('shortlyid', res3.cookies['shortlyid'].value);
      // console.log('cookies', res3.cookies);
      cb(res3);
    });
  });
};

/************************************************************/
// Handle the code parameter route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/:code', (req, res, next) => {

  return models.Links.get({ code: req.params.code })
    .tap(link => {

      if (!link) {
        throw new Error('Link does not exist');
      }
      return models.Clicks.create({ linkId: link.id });
    })
    .tap(link => {
      return models.Links.update(link, { visits: link.visits + 1 });
    })
    .then(({ url }) => {
      res.redirect(url);
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(() => {
      res.redirect('/');
    });
});

module.exports = app;
