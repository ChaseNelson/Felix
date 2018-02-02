const express    = require('express');
const formidable = require('formidable');
const session    = require('express-session');
const parseurl   = require('parseurl');
const fs         = require('fs');

/* Tree data structure */
class Node {
  constructor(instruction, key) {
    this.instruction = instruction;
    this.key = key;
    this.children = [];
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

  deleteNode(nodePath) {
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
    currNode.children.splice(str[str.length - 1], 1);
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
// let json;
// fs.readFile('./public/trees.json', function(err, data) {
//   if (err) return console.error(err);
//   json = JSON.parse(data);
// });
//
// /* wait 100 milliseconds so the trees.json file is fully read */
// let start = new Date().getTime();
//   for (let i = 0; i < 1e7; i++) {
//     if ((new Date().getTime() - start) > 500){
//       break;
//     }
//   }
//
// fs.readFile('./public/keys.json', function(err, data) {
//   if (err) return console.error(err);
//   ids = JSON.parse(data);
//   for (let i = 0; i < ids.length; i++) {
//     trees[ids[i]] = Object.assign(new Tree, json[ids[i]]);
//   }
// });


fs.readFile("./public/keys.json", function(err, data) {
  if (err) return console.error(err);
  ids = JSON.parse(data);
  console.log(ids);
  // /* wait 100 milliseconds so the trees.json file is fully read */
  // let start = new Date().getTime();
  //   for (let i = 0; i < 1e7; i++) {
  //     if ((new Date().getTime() - start) > 2000){
  //       break;
  //     }
  //   }

  for (let i = 0; i < ids.length; i++) {
    fs.readFile('./public/' + ids[i] + "/tree.json", function(err, data) {
      if (err) return console.error(err);
      let json = JSON.parse(data);
      console.log(json);
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
console.log(trees);

app.get('/', function(req, res) {
  res.render('home', {ids});
});

app.use(function(req, res, next) {
  console.log("looking for URL : " + req.url);
  next();
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

app.get('/new-machine', function(req, res) {
  res.render('new-machine');
});

app.post('/process', function(req, res) {
  if (req.query.form === 'formNewMachine') {
    if (typeof trees[req.body.name] === "undefined") {
      let dir = './public/' + req.body.name;
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
        ids.push(req.body.name);
        trees[req.body.name] = new Tree();
        trees[req.body.name].addRoot(req.body.rootNode);
        console.log(trees);
      }
    } else {  // machine already exsits
      console.error(req.body.name + 'is already a machine in the database');
    }
  } else if (req.query.form === 'formEditNode') {
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
      if (req.body.deleteNode !== '') {
        tree.deleteNode(req.body.deleteNode);
      }
    } catch(e) {
      console.error('Something went wrong while editing a node');
      console.error('\tcurrNode : ' + currNode + '\n\ttrace : ' + req.body.trace);
      console.error(e);
    }
  }
  res.redirect(303, '/save');

});

app.get('/fix-it/:machine/', function(req, res) {
  res.render('fix', {name:req.params.machine, node:trees[req.params.machine].root});
});

app.get('/fix-it/:machine/works', function(req, res) {
  res.render('itWorks', {name:req.params.machine});
});

app.get('/fix-it/:machine/expert', function(req, res) {
  res.render('expert', {name:req.params.machine});
});

app.get('/fix-it/:machine/:node', function(req, res) {
  let str = req.params.node.split('.');
  let currNode = trees[req.params.machine].root;
  for (let i = 0; i < str.length; i++) {
    let index = parseInt(str[i]);
    currNode = currNode.children[index];
  }
  res.render('fix', {name:req.params.machine, node:currNode, trace:req.params.node})
});

app.get('/edit', function(req, res) {
  res.render('editChooseMachine', {ids});
});

app.get('/edit/:machine', function(req, res) {
  res.render('editMachine', {name:req.params.machine, node:trees[req.params.machine].root});
});

app.get('/edit/:machine/:node', function(req, res) {
  let str = req.params.node.split('.');
  let currNode = trees[req.params.machine].root;
  for (let i = 0; i < str.length; i++) {
    let index = parseInt(str[i]);
    currNode = currNode.children[index];
  }
  res.render('editMachine', {name:req.params.machine, node:currNode, trace:req.params.node})
});

app.get('/save', function(req, res) {
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
  // fs.writeFile('./public/trees.json', t, 'utf8', function readFileCallback(err, data) {
  //   if (err) return console.error(err);
  // });
  // fs.writeFile('./public/copyOfTrees.json', t,'utf8', function readFileCallback(err, data) {
  //   if (err) return console.error(err);
  // });
  res.redirect(303, '/');
})

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
