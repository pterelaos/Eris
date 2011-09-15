

var io = require('socket.io').listen(8080);

var data = {nodes: [], links: []};

function getNode(id)
{
  return data.nodes.filter(function(n){return id == n.id;})[0];
}

function createlink(s, t)
{
  data.links.push({source: getNode(s), target: getNode(t), size: 0});
}

function newnode(n)
{
  data.nodes.push(n);
}


io.sockets.on('connection', function (socket) {
  socket.emit('data', data);
  socket.on('node', function (n)
  {
    console.log(n);
    newnode(n);
    socket.broadcast.emit('node', n); 
  });
  socket.on('link', function (l) {
    console.log(l);
    createlink(l.s, l.t);
    socket.broadcast.emit('link', l);
  });
  socket.on('disconnect', function () { });
});
