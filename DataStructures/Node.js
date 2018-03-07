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

module.exports = Node;
