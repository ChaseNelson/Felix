const fs = require('fs');

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
};

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
};

module.exports = Tree;
