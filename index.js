/* Middle Ware Consts */
const express    = require('express');
const formidable = require('formidable');
const session    = require('express-session');
const parseurl   = require('parseurl');
const fs         = require('fs');
const multer     = require('multer');
const path       = require('path');
const multiparty = require('multiparty');

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

let graphs = {};
let ids = [];

/* read the keys file to get a list of all the instruments */
fs.readFile("./public/keys.json", (err, data) => {
  if (err) return console.error(err);
  ids = JSON.parse(data);

  /* loop though all the instruments and store their tree information */
  for (let i = 0; i < ids.length; i++) {
    let data = fs.readFileSync('./public/' + ids[i] + '/graph.json', 'utf8');
    let json = JSON.parse(data);
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
  let g = graphs[req.params.machine];
  let gr = g['vertices'];
  let conn = [];
  for (let i = 0; i < gr[g.rootHash].connected.length; i++) {
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

app.get('/fix-it/:machine/:node', (req, res) => {
  let g = graphs[req.params.machine];
  let gr = g['vertices'];
  let conn = [];
  for (let i = 0; i < gr[req.params.node].connected.length; i++) {
    conn.push(gr[gr[req.params.node].connected[i]]);
  }
  res.render('fix', {name:req.params.machine, node:gr[req.params.node], graph:conn})
});

app.get('/edit', (req, res) => {
  res.render('editChooseMachine', {ids});
});

app.get('/edit/:machine', (req, res) => {
  let g = graphs[req.params.machine];
  let gr = g['vertices'];
  let conn = [];
  for (let i = 0; i < gr[g.rootHash].connected.length; i++) {
    conn.push(gr[gr[g.rootHash].connected[i]]);
  }
  res.render('editMachine', {name:req.params.machine, node:gr[g.rootHash], graph:conn});
});

app.get('/edit/:machine/:node', (req, res) => {
  let g = graphs[req.params.machine];
  let gr = g['vertices'];
  let conn = [];
  for (let i = 0; i < gr[req.params.node].connected.length; i++) {
    conn.push(gr[gr[req.params.node].connected[i]]);
  }
  res.render('editMachine', {name:req.params.machine, node:gr[req.params.node], graph:conn})
});

app.post('/process', (req, res) => {
  if (req.query.form === 'formNewMachine') { /* sent from new-machine form */
    if (typeof graphs[req.body.name] === "undefined") {
      let dir = './public/' + req.body.name;
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
        fs.mkdirSync(dir + '/img');
        ids.push(req.body.name);
        graphs[req.body.name] = new Graph(req.body.rootNode);
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
  let form = new multiparty.Form();

  form.parse(req, (err, fields, files) => {
    console.log('fields');
    console.log(fields);
    let g = graphs[fields.machine[0]];
    let gr = g['vertices'];
    let vert = gr[fields.hash[0]];

    // change the instruction
    vert.instruction = fields.instruction[0];

    // add imgages
    for (let i = 0; i < files['img'].length; i++) {
      let file = files['img'][i];
      if (file['originalFilename'] !== '') {
        let tmp_path = file['path'];
        let target_path = './public/' + fields.machine[0] +'/img/' + file['originalFilename'];
        let dir = './public/' + fields.machine[0] + '/img';
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir);
        }
        fs.renameSync(tmp_path, target_path);
        g.addImg(fields.hash[0], file['originalFilename']);
      }
    }
    res.redirect(303, '/save/' + fields.machine[0]);
  });
});

app.get('/save/:machine', (req, res) => {
  var t = JSON.stringify(graphs[req.params.machine]);
  var k = JSON.stringify(ids);
  fs.writeFile('./public/keys.json', k, 'utf8', function readFileCallback(err, data) {
    if (err) return console.error(err);
  });
  fs.writeFile('./public/copyOfKeys.json', k,'utf8', function readFileCallback(err, data) {
    if (err) return console.error(err);
  });

  fs.writeFile('./public/' + req.params.machine + '/graph.json', JSON.stringify(graphs[req.params.machine]), 'utf8', function readFileCallback(err, data) {
    if (err) return console.error(err);
  });
  fs.writeFile('./public/' + req.params.machine + '/copyOfGraph.json', JSON.stringify(graphs[req.params.machine]), 'utf8', function readFileCallback(err, data) {
    if (err) return console.error(err);
  });
  res.redirect(303, '/fix-it/' + req.params.machine);
})

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
})
