const parseCookies = (req, res, next) => {
  // parses cookies and assigns an object of key-value pairs to a session property on the request

  // view all cookies on req object's header
  // turn them into an object (from string)--key is prior to '=', value followed by ';'
  if (req.headers.cookie !== undefined) {

    let cookieArray = req.headers.cookie.split('; ');
    let cookieObj = {};
    cookieArray.forEach(element => {
      let bothPieces = element.split('=');
      cookieObj[bothPieces[0]] = bothPieces[1];
    });
    // put them onto the request
    req.cookies = cookieObj;
  }
  next();

};

module.exports = parseCookies;