export class Connection {
  constructor(node1, node2, type, state) {
    this.node1 = node1;
    this.node2 = node2;
    this.type = type; // 'provider', 'consumer', 'mutual'
    this.state = state; //'initiated', 'accepted'
  }
}
