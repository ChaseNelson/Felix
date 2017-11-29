const express    = require('express');
const formidable = require('formidable');
const credentials = require('./credentials.js');

var app = express();

app.disable('x-powered-by');

const handlebars = require('express-handlebars').create({defaultLayout:'main'});
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.use(require('body-parser').urlencoded({extended:true}));

app.use(require('cookie-parser')(credentials.cookieSecret));


app.set('port', process.env.PORT || 3000);
app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {
  res.render('home');
});

app.use(function(req, res, next) {
  console.log("looking for URL : " + req.url);
  next();
});

app.get('/junk', function(req, res, next) {
  console.log("tired to access /junk");
  throw new Error('/junk doesn\'t exist');
});

app.use(function(err, req, res, next) {
  console.log("Error : " + err.message);
  next();
});

app.get('/about', function(req, res) {
  res.render('about');
});

app.get('/contact', function(req, res) {
  res.render('contact', { csrf: 'CSRF token here'});
});

app.get('/thankyou', function(req, res) {
  res.render('thankyou');
});

app.post('/process', function(req, res) {
  console.log("Form : " + req.query.form);
  console.log("CSRF token : " + req.body._csrf);
  console.log("Email : " + req.body.email);
  console.log("Question : " + req.body.ques);
  res.redirect(303, '/thankyou');
});

app.use(function(req, res) {
  res.type('text/html');
  res.status(404);
  res.render('404');
});

app.use(function(req, res) {
  console.error(err.stack);
  res.status(500);
  res.render('500');
});

app.listen(app.get('port'), function(){
  console.log("Express started on http://localhost:" + app.get('port') + "\nPress Crtl+C to terminate.");
})
