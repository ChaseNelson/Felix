const express    = require('express');
const formidable = require('formidable');
const session    = require('express-session');
const parseurl   = require('parseurl');
const fs         = require('fs');
const multer     = require('multer');
const path       = require('path');

/* Tree data structure */
class Node {
  constructor(instruction, key) {
    this.instruction = instruction;
    this.key         = key;
    this.img         = [];
    this.children    = [];
  }

  addImg(path) {
    this.img.push(path);
  }
}

class Tree {
  constructor(instruction) {
    if (typeof instruction == 'undefined') {
      this.root = null;
    } else {
      this.root = new Node(instruction, 'ROOT');
    }
  }

  search(instruction, key, currentNode) {
    if (currentNode.instruction === instruction && currentNode.key === key) {
      return currentNode;
    }
    let children = currentNode.children;
    for (let i = 0; i < children.length; i++) {
      if (this.search(instruction, key, children[i]) !== false) return currentNode;
    }
    return false;
  }

  addRoot(instruction) {
    if (this.root == null) {
      this.root = new Node(instruction, 'ROOT');
      return this.root;
    }
  }

  put(instruction, key, nodeStr) {
    if (nodeStr === '' || nodeStr === 'ROOT') {
      this.root.children.push(new Node(instruction, key));
      return;
    }
    let str = nodeStr.split('.')
    let currNode = this.root;
    for (let i = 0; i < str.length; i++) {
      let temp = parseInt(str[i]);
      currNode = currNode.children[temp];
    }
    let newNode = new Node(instruction, key);
    try {
      currNode.children.push(newNode);
    } catch(e) {
      console.error('Something went wrong!');
      console.error(e);
    }
  }

  editNode(nodePath, newName, mode) {
    if (nodePath === 'ROOT' || nodePath === '') {
      if (mode === 'I') this.root.instruction = newName;
      return;
    }
    let str      = nodePath.split('.');
    let currNode = this.root;
    for (let i = 0; i < str.length; i++) {
      let index = parseInt(str[i]);
      currNode = currNode.children[index];
    }
    try {
      if (mode === 'K' && currNode.key !== newName) {
        currNode.key = newName;
      } else if (mode === 'I' && currNode.instruction !== newName) {
        currNode.instruction = newName;
      }
    } catch(e) {
      console.error('Something went wrong');
      console.error(e);
    }
  }

  removeIMG(currNode, name) {
    for (let i = 0; i < currNode.img.length; i++) {
      fs.unlink('public/' + name + '/img/' + currNode.img[i], (err) => {
        if (err) return err;
        console.log('public/' + name + '/img/' + currNode.img[i] + " was deleted");
      })
    }
    for (let i = 0; i < currNode.children.length; i++) {
      this.removeIMG(currNode.children[i], name);
    }
  }

  deleteNode(nodePath, name) {
    if (nodePath === 'ROOT' || nodePath === '') {
      console.log('tried to delete root\nnot allowed');
      alert('You cannot remove the ROOT node');
      return;
    }
    let str      = nodePath.split('.');
    let currNode = this.root;
    for (let i = 0; i < str.length - 1; i++) {
      let index = parseInt(str[i]);
      currNode  = currNode.children[index];
    }
    this.removeIMG(currNode.children[str.length - 1], name);
    currNode.children.splice(str[str.length - 1], 1);
  }

  addImg(nodePath, imgPath) {
    if (nodePath === 'ROOT' || nodePath === '') {
      this.root.img.push(imgPath);
      return
    }
    let str = nodePath.split('.');
    let currNode = this.root;
    for (let i = 0; i < str.length; i++) {
      let index = parseInt(str[i]);
      currNode = currNode.children[index];
    }
    currNode.img.push(imgPath);
    console.log(currNode);
  }
} /* End of Tree data structure */

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


fs.readFile("./public/keys.json", (err, data) => {
  if (err) return console.error(err);
  ids = JSON.parse(data);

  for (let i = 0; i < ids.length; i++) {
    fs.readFile('./public/' + ids[i] + "/tree.json", (err, data) => {
      if (err) return console.error(err);
      let json = JSON.parse(data);
      trees[ids[i]] = Object.assign(new Tree, json);
    })
  };
});


/* wait 100 milliseconds so the trees.json file is fully read */
start = new Date().getTime();
  for (let i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > 500){
      break;
    }
  }

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
  let machine;
  if (req.query.form === 'formNewMachine') {
    if (typeof trees[req.body.name] === "undefined") {
      let dir = './public/' + req.body.name;
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
        ids.push(req.body.name);
        trees[req.body.name] = new Tree();
        trees[req.body.name].addRoot(req.body.rootNode);
        console.log(trees);
        machine = req.body.name;
      }
    } else {  // machine already exsits
      console.error(req.body.name + 'is already a machine in the database');
    }
  } else if (req.query.form === 'formEditNode') {
    machine = req.body.machine;
    console.log("Machine Name : " + req.body.machine);
    console.log("Trace : " + req.body.trace);
    console.log("Instruction : " + req.body.instruction);
    console.log("New Node : ");
    console.log("\tKey : " + req.body.newKey);
    console.log("\tInstruction : " + req.body.newInstruction);
    console.log("Delete Node : " + req.body.deleteNode);
    let tree = trees[req.body.machine];
    tree.editNode(req.body.trace, req.body.instruction, 'I');
    let currNode = tree.root;
    try {
      // Create new node
      if (req.body.newKey !== '' && req.body.newInstruction !== '') {
        if (req.body.trace !== 'ROOT' && req.body.trace !== '') {
          let trace = req.body.trace.split('.');
          for (let i = 0; i < trace.length; i++) {
            let index = parseInt(trace[i]);
            currNode = currNode.children[index];
          }
        }
        currNode.children.push(new Node(req.body.newInstruction, req.body.newKey))
      }

      // Delete node
      if (req.body.deleteNode !== '') {
        tree.deleteNode(req.body.deleteNode, req.body.machine);
      }
    } catch(e) {
      console.error(e);
    }
  } else if (req.query.form === 'formAddImgNode') { /* Add image */
    machine = req.query.machine;
    let node = req.query.node;
    console.log("Machine :: " + machine);
    /*  Set Storage Engine */
    let p = './public/' + machine + '/img';
    const storage = multer.diskStorage({
      destination: p
    });

    /* Init upload */
    const upload = multer({
      storage: storage,
      fileFilter: (req, file, cb) => {
        // allowed ext
        const filetypes = /jpeg|jpg|png|gif/;
        // check ext
        const extName = filetypes.test(path.extname(file.originalname).toLowerCase());
        // check mimetype
        const mimeType = filetypes.test(file.mimetype)
        if (extName && mimeType) {
          return cb(null, true);
        } else {
          cb('Error: Images Only!');
        }
      }
    }).single('img');

    upload(req, res, (err) => {
      if (err) return err;
      console.log(req.file);
      trees[machine].addImg(node, req.file.filename);
    });
  }
  res.redirect(303, '/save/' + machine);
});

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

app.get('/uploadImg', (req, res) => res.render('uploadChooseMachine', {ids}));

app.get('/uploadImg/:machine', (req, res) => res.render('uploadMachine', {name:req.params.machine, node:trees[req.params.machine].root}));

app.get('/uploadImg/:machine/:node', (req, res) => {
  let str = req.params.node.split('.');
  let currNode = trees[req.params.machine].root;
  for (let i = 0; i < str.length; i++) {
    let index = parseInt(str[i]);
    currNode = currNode.children[index];
  }
  res.render('uploadMachine', {name:req.params.machine, node:currNode, trace:req.params.node});
});

app.get('/save/:machine', (req, res) => {
  var t = JSON.stringify(trees);
  var k = JSON.stringify(ids);
  fs.writeFile('./public/keys.json', k, 'utf8', function readFileCallback(err, data) {
    if (err) return console.error(err);
  });
  fs.writeFile('./public/copyOfKeys.json', k,'utf8', function readFileCallback(err, data) {
    if (err) return console.error(err);
  });

  for (let i = 0; i < ids.length; i++) {
    fs.writeFile('./public/' + ids[i] + '/tree.json', JSON.stringify(trees[ids[i]]), 'utf8', function readFileCallback(err, data) {
      if (err) return console.error(err);
    });
    fs.writeFile('./public/' + ids[i] + '/copyOfTree.json', JSON.stringify(trees[ids[i]]), 'utf8', function readFileCallback(err, data) {
      if (err) return console.error(err);
    });
  }
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
