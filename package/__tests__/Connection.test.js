import { Connection } from '../classes/Connection.js';

describe('Connection', () => {
  test('stores constructor parameters', () => {
    const node1 = { id: 'a' };
    const node2 = { id: 'b' };
    const c = new Connection(node1, node2, 'provider', 'accepted');
    expect(c.node1).toBe(node1);
    expect(c.node2).toBe(node2);
    expect(c.type).toBe('provider');
    expect(c.state).toBe('accepted');
  });
});
