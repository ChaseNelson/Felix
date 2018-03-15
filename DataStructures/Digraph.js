const md5 = require('md5');

class Node {
  constructor(instruction, key) {
    this.instruction = instruction;
    this.key         = key;
    this.name        = md5(this.instruction.replace(/\s/g,'')+ ' ' + this.key.replace(/\s/g,''));
    this.ref         = 0;
    this.img         = [];
    this.connected   = [];
  }

  addImg(path) {
    this.img.push(path);
  }
};

class Digraph {
  constructor(instruction) {
    let root;
    if (typeof instruction === 'undefined') {
      root = null;
      return;
    } else {
      root = new Node(instruction, 'ROOT')
    }
    root.ref = 1;
    this.rootHash = root.name;
    this.vertices = {};
    this.vertices[this.rootHash] = root;
  }

  addVertice(instruction, key, parentHash) {
    // create a temp node
    let temp_node = new Node(instruction, key);
    let h = temp_node.name;
    // make sure the vertice does not already exist and that the parent is valid
    if (typeof this.vertices[h] !== 'undefined' || typeof this.vertices[parentHash] !== 'undefined') return false;

    // increment ref counter and add vertice to vertices list and partent list
    temp_node.ref++;
    this.vertices[h] = temp_node;
    this.vertices[parentHash].connected.push(h);
    return true;
  }

  addEdge(parentHash, childHash) {
    // make sure that parent and child exists
    if (typeof this.vertices[parentHash] === 'undefined' || typeof this.vertices[childHash] === 'undefined') return false;
    // crete temp vars to hold parent and child
    let parent = this.vertices[parentHash], child = this.vertices[childHash];
    // increment child ref and add child to parent connected
    child.ref++;
    parent.connected.push(childHash);
    return true;
  }

  /**
    * this method should remove an edge from one vert to another
    * and if the second vert does not have any references remove it from the list
    * then check the child to see if it has refs
  */
  /* @TODO: implement what is stated above */
  deleteVertice(vertHash) {
    // make sure vertice exists
    if (typeof this.vertice[vertHash] === 'undefined') return false;
    // create temp var to hole vertice
    let vert = this.vertices[vertHash];
    // remove vert from vertices
    this.vertices[vertHash] = undefined;
    // remove all references of parent vertices
    for (x in this.vertices) {
      if (typeof x === 'undefined') continue;
      let index = x.connected.indexOf(vertHash)
      if (index > -1) {
        // remove vertHash from connected
        x.connected.splice(index, 1);
      }
    }
    // decrement all children and if ref == 0 remove the children
    for (let i = 0; i < vert.connected.length; i++) {
      let temp = this.vertices[vert.connected[i]];
      temp.ref--;
      if (temp.ref == 0) {
        this.deleteVertice(temp.name);
      }
    }
  }

  addImg(vertHash, imgPath) {
    if (typeof this.vertices[vertHash] === 'undefined') return false;
    this.vertices[vertHash].img.push(imgPath);
    return true;
  }
}

module.exports = Digraph;
