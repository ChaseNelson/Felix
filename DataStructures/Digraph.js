const md5 = require('md5');
const fs  = require('fs');

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
  constructor(instruction, instrumentName) {
    let root;
    if (typeof instruction === 'undefined') {
      root = null;
      return;
    } else {
      root = new Node(instruction, 'ROOT')
    }
    root.ref = 1;
    this.instrumentName = instrumentName;
    this.rootHash = root.name;
    this.vertices = {};
    this.vertices[this.rootHash] = root;
  }

  addVertex(instruction, key, parentHash) {
    // Chech that all the params are filled
    if (instruction === '' || key === '' || parentHash === '') return false;
    if (instruction === null || key === null || parentHash === null) return false;

    // create a temp node
    let temp_node = new Node(instruction, key);
    let h = temp_node.name;
    // make sure the vertex does not already exist and that the parent is valid
    if (typeof this.vertices[h] !== 'undefined' || typeof this.vertices[parentHash] === 'undefined') return false;

    // increment ref counter and add vertex to vertices list and partent list
    temp_node.ref++;
    this.vertices[h] = temp_node;
    this.vertices[parentHash].connected.push(h);
    return true;
  }

  addEdge(parentHash, childHash) {
    // make sure all params are valid
    if (parentHash === '' || childHash === '') return false;
    if (parentHash === null || childHash === null) return false;

    // make sure that parent and child exists
    if (typeof this.vertices[parentHash] === 'undefined' || typeof this.vertices[childHash] === 'undefined') return false;

    // crete temp vars to hold parent and child
    let parent = this.vertices[parentHash]
    let child = this.vertices[childHash];

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
  deleteEdge(vertHash, connHash) {
    // make sure all params are valid
    if (vertHash === '' || connHash === '') return false;
    if (vertHash === null || connHash === null) return false;

    // make sure vertex exists
    if (typeof this.vertices[vertHash] === 'undefined' || typeof this.vertices[connHash] === 'undefined') return false;

    // create temp var to hole vertex
    let vert = this.vertices[vertHash];
    let conn = this.vertices[connHash];

    // remove conn from vert connected
    let index = vert.connected.indexOf(connHash);
    if (index <= -1) return false; // conn is not connected to vert
    vert.connected.splice(index, 1);

    // decrement conn ref count
    conn.ref--;

    // chech if ref has 0 connections
    if (conn.ref > 0) return true;

    // remove all children
    for (let i = 0; i < conn.connected.length; i++) {
      this.deleteEdge(connHash, conn.connected[i]);
    }

    // delete pictures
    for (let i = 0; i < conn.img.length; i++) {
      fs.unlink('public/' + this.instrumentName + '/img/' + conn.img[i], (err) => {
        if (err) return err;
        console.log('public/' + this.instrumentName + '/img/' + conn.img[i] + ' was deleted.');
      });
    }

    // remove from map
    this.vertices[connHash] = undefined;
    return true;
  }

  addImg(vertHash, imgPath) {
    if (typeof this.vertices[vertHash] === 'undefined') return false;
    this.vertices[vertHash].img.push(imgPath);
    return true;
  }

  getAllVertices() {
    let ret = [];
    for (let i in this.vertices) {
      ret.push(i);
    }
    return ret;
  }
}

module.exports = Digraph;
