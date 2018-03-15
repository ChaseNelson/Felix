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
const Tree = require('./DataStructures/Tree.js');

var app = express();

app.disable('x-powered-by');

const handlebars = require('express-handlebars').create({defaultLayout:'main'});
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.use(require('body-parser').urlencoded({extended:true}));

app.set('port', process.env.PORT || 3000);
app.use(express.static(__dirname + '/public'));

let trees = {};
let ids = [];

/* read the keys file to get a list of all the instruments */
fs.readFile("./public/keys.json", (err, data) => {
  if (err) return console.error(err);
  ids = JSON.parse(data);

  /* loop though all the instruments and store their tree information */
  for (let i = 0; i < ids.length; i++) {
    let data = fs.readFileSync('./public/' + ids[i] + '/tree.json', 'utf8');
    let json = JSON.parse(data);
    trees[ids[i]] = Object.assign(new Tree, json);
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

app.post('/process', (req, res) => {
  if (req.query.form === 'formNewMachine') { /* sent from new-machine form */
    if (typeof trees[req.body.name] === "undefined") {
      let dir = './public/' + req.body.name;
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
        ids.push(req.body.name);
        trees[req.body.name] = new Tree();
        trees[req.body.name].addRoot(req.body.rootNode);
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
    let machine = fields.machine[0];
    let tree = trees[machine];
    let currNode = tree.root;
    tree.editNode(fields.trace[0], fields.instruction[0], 'I');
    // Create new node
    if (fields.newKey[0] !== '' && fields.newInstruction[0] !== '') {
      if (fields.trace[0] !== 'ROOT' && fields.trace[0] !== '') {
        let t = fields.trace[0];
        for (let i = 0; i < t.length; i++) {
          let index = parseInt(t[i]);
          currNode = currNode.children[index];
        }
      }
      currNode.children.push(new Node(fields.newInstruction[0], fields.newKey[0]));
    } // end of create node

    // Delete node
    if (fields.deleteNode[0] !== '') {
      tree.deleteNode(fields.deleteNode[0], machine);
    }
    for (let i = 0; i < files['img'].length; i++) {
      let file = files['img'][i];
      if (file['originalFilename'] !== '') {
        let tmp_path = file['path'];
        let target_path = 'public/' + machine +'/img/' + file['originalFilename'];
        fs.renameSync(tmp_path, target_path);
        trees[machine].addImg(fields.trace[0], file['originalFilename']);
      }
    }
  })

  let machine = req.query.machine;
  res.redirect(303, '/save/' + machine);
})

app.get('/fix-it/:machine/', (req, res) => {
  res.render('fix', {name:req.params.machine, node:trees[req.params.machine].root});
});

app.get('/fix-it/:machine/works', (req, res) => {
  res.render('itWorks', {name:req.params.machine});
});

app.get('/fix-it/:machine/expert', (req, res) => {
  res.render('expert', {name:req.params.machine});
});

app.get('/fix-it/:machine/:node', (req, res) => {
  let str = req.params.node.split('.');
  let currNode = trees[req.params.machine].root;
  for (let i = 0; i < str.length; i++) {
    let index = parseInt(str[i]);
    currNode = currNode.children[index];
  }
  res.render('fix', {name:req.params.machine, node:currNode, trace:req.params.node})
});

app.get('/edit', (req, res) => {
  res.render('editChooseMachine', {ids});
});

app.get('/edit/:machine', (req, res) => {
  res.render('editMachine', {name:req.params.machine, node:trees[req.params.machine].root});
});

app.get('/edit/:machine/:node', (req, res) => {
  let str = req.params.node.split('.');
  let currNode = trees[req.params.machine].root;
  for (let i = 0; i < str.length; i++) {
    let index = parseInt(str[i]);
    currNode = currNode.children[index];
  }
  res.render('editMachine', {name:req.params.machine, node:currNode, trace:req.params.node})
});

app.get('/save/:machine', (req, res) => {
  var t = JSON.stringify(trees[req.params.machine]);
  var k = JSON.stringify(ids);
  fs.writeFile('./public/keys.json', k, 'utf8', function readFileCallback(err, data) {
    if (err) return console.error(err);
  });
  fs.writeFile('./public/copyOfKeys.json', k,'utf8', function readFileCallback(err, data) {
    if (err) return console.error(err);
  });

  fs.writeFile('./public/' + req.params.machine + '/tree.json', JSON.stringify(trees[req.params.machine]), 'utf8', function readFileCallback(err, data) {
    if (err) return console.error(err);
  });
  fs.writeFile('./public/' + req.params.machine + '/copyOfTree.json', JSON.stringify(trees[req.params.machine]), 'utf8', function readFileCallback(err, data) {
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
