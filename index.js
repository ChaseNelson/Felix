const express    = require('express');
const formidable = require('formidable');
const session    = require('express-session');
const parseurl   = require('parseurl');
const fs         = require('fs');

// @TODO:: find a way to import the tree struct
//         rather then having the following lines
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
    let parentNode;
    let ele;
    if (str.length - 1 <= 0) {
      parentNode = this.root;
    }
    for (let i = 0; i < str.length; i++) {
      let index = parseInt(str[i]);
      currNode = currNode.children[index];
      if (i === str.length - 2) {
        parentNode = currNode;
      } else if (i === str.length - 1) {
        ele = i;
      }
    }

    for (let i = 0; i < currNode.children.length; i++) {
      this.deleteNode(nodePath + '.' + i);
    }

    currNode.instruction = null;
    currNode.key = null;
    currNode = null;
    // remove currNode from parent children array
    parentNode.children.splice(ele, 1);
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

// @TODO:: remove the following lines once done with testing
// The line below init two empty trees for a wirebonder and a gantree
let trees = {};
let ids = [];
trees['wireBonder'] = new Tree('Reboot the machine');
trees['wireBonder'].put('flip the lever', 'the green light turned on', 'ROOT');
trees['wireBonder'].put('check the fuse', 'the red light turned on', 'ROOT');
trees['wireBonder'].put('press the button', 'the green light turned off', '0');
ids.push('wireBonder');
trees['gantree'] = new Tree('Plug the device in');
ids.push('gantree');
// End of test lines

fs.readFile('./public/machineList.json', function (err, data) {
  if (err) return console.error(err);
  list = JSON.parse(data);
});

app.get('/', function(req, res) {
  res.render('home', {ids});
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

app.get('/new-machine', function(req, res) {
  res.render('new-machine');
});

app.post('/process', function(req, res) {
  // console.log("Form : " + req.query.form);
  // console.log("Machine Name : " + req.body.name);
  // console.log("Root Node : " + req.body.rootNode);
  if (req.query.form === 'formNewMachine') {
    if (typeof trees[req.body.name] === "undefined") {
      ids.push(req.body.name);
      trees[req.body.name] = new Tree();
      trees[req.body.name].addRoot(req.body.rootNode);
      console.log(trees);
    } else {
      // machine already exsits
      console.error(req.body.name + 'is already a machine in the database');
    }
  } else if (req.query.form === 'formEditNode') {
    console.log("Machine Name : " + req.body.machine);
    console.log("Trace : " + req.body.trace);
    console.log("Instruction : " + req.body.instruction);
    console.log("New Node : ");
    console.log("\tKey : " + req.body.newKey);
    console.log("\tInstruction : " + req.body.newInstruction);
    let tree = trees[req.body.machine];
    tree.editNode(req.body.trace, req.body.instruction, 'I');
    let currNode = tree.root;
    try {
      if (req.body.newKey !== '' && req.body.newInstruction !== '') {
        /* @TODO: add a new child node to currnode with newKey and newInstruction */
        if (req.body.trace !== 'ROOT' && req.body.trace !== '') {
          let trace = req.body.trace.split('.');
          for (let i = 0; i < trace.length; i++) {
            let index = parseInt(trace[i]);
            currNode = currNode.children[index];
          }
        }
        currNode.children.push(new Node(req.body.newInstruction, req.body.newKey))
      }
      /* @TODO: add function ality to delete nodes */
    } catch(e) {
      console.error('Something went wrong while editing a node');
      console.error('\tcurrNode : ' + currNode + '\n\ttrace : ' + req.body.trace);
      console.error(e);
    }
  }
  res.redirect(303, '/thankyou');
  // var fn = "/public/repairDB_" + req.body.name + ".json";
  // fs.writeFile(fn, function(err) {
  //   if (err) return console.log(err);
  //   console.log();
  // })
});

app.get('/file-upload', function(req, res) {
  var now = new Date();
  res.render('file-upload', {
    year  : now.getFullYear(),
    month : now.getMonth()
  });
});

app.get('/file-upload/:year/:month', function(req, res) {
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, file) {
    if (err) return res.redirect(303, '/error');
    console.log('Received File');
    console.log(file);
    res.redirect(303, '/thankyou');
  });
});

fs.readFile('./public/repairDB_wirebonder.json', function (err, data) {
  if (err) return console.error(err);
  wireBonder = JSON.parse(data);
})
app.get('/wireBonder', function(req, res) {
  res.render('fix-it', wireBonder['start']);
});
app.get('/wireBonder/:key', function(req, res) {
  res.render('fix-it', wireBonder[req.params.key]);
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
