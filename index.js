/* Middle Ware Consts */
const express    = require('express');
const formidable = require('formidable');
const session    = require('express-session');
const parseurl   = require('parseurl');
const fs         = require('fs');
const multer     = require('multer');
const path       = require('path');
const multiparty = require('multiparty');
const nodemailer = require('nodemailer');

/* Data structures used to store information in Felix */
const Node = require('./DataStructures/Node.js');
const Graph = require('./DataStructures/Digraph.js');

var app = express();

app.disable('x-powered-by');

const handlebars = require('express-handlebars').create({defaultLayout:'main'});
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.use(require('body-parser').urlencoded({extended:true}));

app.set('port', process.env.PORT || 3000);
app.use(express.static(__dirname + '/public'));

var graphs = {};
var ids = [];

/* read the keys file to get a list of all the instruments */
fs.readFile("./public/keys.json", (err, data) => {
  if (err) return  console.error(err);
  ids = JSON.parse(data);

  /* loop though all the instruments and store their tree information */
  for (var i = 0; i < ids.length; i++) {
    var data = fs.readFileSync('./public/' + ids[i] + '/graph.json', 'utf8');
    var json = JSON.parse(data);
    graphs[ids[i]] = Object.assign(new Graph, json);
  };
});

app.get('/', (req, res) => {
  res.render('home', {ids});
});

app.use((req, res, next) => {
  console.log("looking for URL : " + req.url);
  next();
});

app.use((err, req, res, next) => {
  console.log("Error : " + err.message);
  next();
});

app.get('/about', (req, res) => {
  res.render('about');
});

app.get('/contact', (req, res) => {
  res.render('contact', { csrf: 'CSRF token here'});
});

app.get('/new-machine', (req, res) => {
  res.render('new-machine');
});

app.get('/fix-it/:machine/', (req, res) => {
  var g = graphs[req.params.machine];
  var gr = g['vertices'];
  var conn = [];
  for (var i = 0; i < gr[g.rootHash].connected.length; i++) {
    conn.push(gr[gr[g.rootHash].connected[i]]);
  }
  res.render('fix', {name:req.params.machine, node:gr[g.rootHash], graph:conn});
});

app.get('/fix-it/:machine/works', (req, res) => {
  res.render('works', {name:req.params.machine});
});

app.get('/fix-it/:machine/expert', (req, res) => {
  res.render('expert', {name:req.params.machine});
});

app.get('/fix-it/:machine/:node', (req, res, next) => {
  try {
    var g = graphs[req.params.machine];
    var gr = g['vertices'];
    var conn = [];
    for (var i = 0; i < gr[req.params.node].connected.length; i++) {
      conn.push(gr[gr[req.params.node].connected[i]]);
    }
    res.render('fix', {name:req.params.machine, node:gr[req.params.node], graph:conn})
  } catch (e) {
      console.error(e);
      res.status(404);
      next();
  }
});

app.get('/edit', (req, res) => {
  res.render('editChooseMachine', {ids});
});

app.get('/edit/:machine', (req, res, next) => {
  try {
    var g = graphs[req.params.machine];
    var gr = g['vertices'];
    var conn = [];
    for (var i = 0; i < gr[g.rootHash].connected.length; i++) {
      conn.push(gr[gr[g.rootHash].connected[i]]);
    }
    res.render('editMachine', {name:req.params.machine, node:gr[g.rootHash], graph:conn});
  } catch (e) {
    console.error(e);
    res.status(404);
    next();
  }
});

app.get('/edit/:machine/:node', (req, res, next) => {
  try {
    var g = graphs[req.params.machine]; // the entire digraph object
    var gr = g['vertices']; // just the vertices of the digraph

    // store all the connected vertices to the current vertex in curr
    var conn = [];
    for (var i = 0; i < gr[req.params.node].connected.length; i++) {
      conn.push(gr[gr[req.params.node].connected[i]]);
    }

    // get all the hashes
    var vert = g.getAllVertices();
    // remove the current hash
    vert.splice(vert.indexOf(req.params.node), 1);
    for (var i = 0; i < conn.length; i++) { // remove all hashes at are already connected
      var index = vert.indexOf(conn);
      vert.splice(index, 1);
    }
    var v = [];
    for (var i = 0; i < vert.length; i++) { // grab all the vertices of the hashes
      v.push(gr[vert[i]]);
    }

    res.render('editMachine', {name:req.params.machine, node:gr[req.params.node], graph:conn, vert:v})
  } catch (e) {
    console.error(e);
    res.status(404);
    next();
  }
});

app.post('/process', (req, res) => {
  if (req.query.form === 'formNewMachine') { /* sent from new-machine form */
    if (typeof graphs[req.body.name] === "undefined") {
      var dir = './public/' + req.body.name;
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
        fs.mkdirSync(dir + '/img');
        ids.push(req.body.name);
        graphs[req.body.name] = new Graph(req.body.rootNode, req.body.name);
        console.log(graphs);
      } else { // directory already exsits
        console.error(req.body.name + ' is already a directory in the database');
      }
    } else {  // machine already exsits
      console.error(req.body.name + ' is already a instruction in the database');
    }
  }
  res.redirect(303, '/save/' + req.body.name);
});

app.post('/editNode', (req, res) => {
  var form = new multiparty.Form();

  form.parse(req, (err, fields, files) => {
    console.log('fields');
    console.log(fields);
    var g = graphs[fields.machine[0]];
    var gr = g['vertices'];
    var vert = gr[fields.hash[0]];

    // change the instruction
    vert.instruction = fields.instruction[0];

    // add imgages
    for (var i = 0; i < files['img'].length; i++) {
      var file = files['img'][i];
      if (file['originalFilename'] !== '') {
        var tmp_path = file['path'];
        var target_path = './public/' + fields.machine[0] +'/img/' + file['originalFilename'];
        var dir = './public/' + fields.machine[0] + '/img';
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir);
        }
        fs.renameSync(tmp_path, target_path);
        g.addImg(fields.hash[0], file['originalFilename']);
      }
    }

    // create a new vertex and add an edge from this to new vertex
    g.addVertex(fields.newInstruction[0], fields.newKey[0], fields.hash[0]);

    // delete edge to node
    var t = g.deleteEdge(fields.hash[0], fields.deleteNode[0]);

    // add edge from this to connectedNode
    g.addEdge(fields.hash[0], fields.connectNode[0])

    // save the machine
    res.redirect(303, '/save/' + fields.machine[0]);
  });
});

app.post('/contactForm', (req, res) => {
  /* @TODO: send an email containing the form body /
  var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'youremail@gmail.com',
      pass: 'yourpassword'
    }
  });
  var mailOptions = {
    from: 'youremail@gmail.com',
    to: 'myfriend@yahoo.com',
    subject: 'Felix Form',
    text: 'Felix Form Below\nName: ' + req.body.name + '\nEmail: ' + req.body.email + '\nMessage: ' + req.body.message;
  };
  transporter.sendMail(mailOptions, function(error, info){
    if (error) console.log(error);
  }); */
  console.log(req.body.name);
  console.log(req.body.email);
  console.log(req.body.message);
  res.redirect(303, '/');
});

app.get('/save/:machine', (req, res, next) => {
  try {
    var t = JSON.stringify(graphs[req.params.machine]);
    var k = JSON.stringify(ids);
    fs.writeFileSync('./public/keys.json', k, 'utf8');
    fs.writeFileSync('./public/copyOfKeys.json', k,'utf8');

    fs.writeFileSync('./public/' + req.params.machine + '/graph.json', JSON.stringify(graphs[req.params.machine]), 'utf8');
    fs.writeFileSync('./public/' + req.params.machine + '/copyOfGraph.json', JSON.stringify(graphs[req.params.machine]), 'utf8');
    res.redirect(303, '/fix-it/' + req.params.machine);
  } catch (e) {
    console.error(e);
    res.status(404);
    next();
  }
});

app.use((req, res) => {
  res.type('text/html');
  res.status(404);
  res.render('404');
});

app.use((req, res) => {
  console.error(err.stack);
  res.status(500);
  res.render('500');
});

app.listen(app.get('port'), () => {
  console.log("Express started on http://localhost:" + app.get('port') + "\nPress Crtl+C to terminate.");
});
