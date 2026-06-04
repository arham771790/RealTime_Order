# Horizontal Scaling

Socket.IO can run across multiple backend instances by enabling the Redis adapter:

```env
SOCKET_REDIS_ADAPTER_ENABLED=true
REDIS_URL=redis://redis:6379
```

The adapter forwards Socket.IO room broadcasts through Redis so a client connected to one backend instance can still receive an event emitted by another instance.

Load balancers should still use sticky sessions for websocket upgrades. Sticky sessions keep a client's long-lived socket attached to the same backend process, while the Redis adapter handles cross-instance fanout for rooms such as `admin:global`, `order:{id}`, `customer:{name}`, and `status:{status}`.

Recommended production setup:

- Run at least two backend instances behind a load balancer that supports websocket upgrades.
- Enable cookie-based or IP-hash stickiness at the load balancer.
- Point every backend instance at the same Redis deployment.
- Keep the Redis Pub/Sub channel and Socket.IO adapter Redis deployment highly available.
