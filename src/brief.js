


var w = 960,     // svg width
    h = 600,     // svg height
    dr = 4,      // default point radius
    off = 15,    // cluster hull offset
    expand = {}, // expanded clusters
    data = {nodes: [], links: []},
    net, force, hullg, hull, linkg, link, nodeg, node,
    curve = d3.svg.line().interpolate("cardinal-closed").tension(.85),
    fill = d3.scale.category20();


var body = d3.select("body");


var vis = d3.select("#viz").append("svg:svg");

function newnode(n)
{
  data.nodes.push(n);
  expand[n.id] = true;
  init();
}
   
   
vis.on("click", function() {
  var point = d3.svg.mouse(this),
      i = data.nodes.length
      node = {x: point[0],
              y: point[1],
              name:i,
	      group:i,
              id:i
              };
//      n = data.nodes.push(node);
//  expand[i] = true;
  newnode(node, i);
  socket.emit('node', {x:point[0], y:point[1], name:i, group:i, id:i});
  deselect();

});




var settings = {
	gravity:1,
	charge:-50,
	distance:50,
	scale:1,
	friction:0.1,
   strength:1
};

var sys = {
      parameters:function(newParams){
        if (newParams!==undefined){
          if (!isNaN(newParams.precision)){
            newParams.precision = Math.max(0, Math.min(1, newParams.precision))
          }
          $.each(settings, function(p, v){
            if (newParams[p]!==undefined) settings[p] = newParams[p]
          })
          init();
        }
        return settings;
      }
};


var dashboard = Dashboard("#dashboard", sys);


hullg = vis.append("svg:g");
linkg = vis.append("svg:g");
nodeg = vis.append("svg:g");

$(window).resize(init);

function noop() { return false; }

function nodeid(n) {
  return n.size ? "_g_"+n.group : n.name;
}

function linkid(l) {
  var u = nodeid(l.source),
      v = nodeid(l.target);
  return u<v ? u+"|"+v : v+"|"+u;
}

function getGroup(n) { return n.group; }

// constructs the network to visualize
function network(data, prev, index, expand) {
  expand = expand || {};
  var gm = {},    // group map
      nm = {},    // node map
      lm = {},    // link map
      gn = {},    // previous group nodes
      gc = {},    // previous group centroids
      nodes = [], // output nodes
      links = []; // output links

  // process previous nodes for reuse or centroid calculation
  if (prev) {
    prev.nodes.forEach(function(n) {
      var i = index(n), o;
      if (n.size > 0) {
        gn[i] = n;
        n.size = 0;
      } else {
        o = gc[i] || (gc[i] = {x:0,y:0,count:0});
        o.x += n.x;
        o.y += n.y;
        o.count += 1;
      }
    });
  }

  // determine nodes
  for (var k=0; k<data.nodes.length; ++k) {
    var n = data.nodes[k],
        i = index(n);

    if (expand[i]) {
      // the node should be directly visible
      nm[n.name] = nodes.length;
      nodes.push(n);
      if (gn[i]) {
        // place new nodes at cluster location (plus jitter)
        n.x = gn[i].x + Math.random();
        n.y = gn[i].y + Math.random();
      }
    } else {
      // the node is part of a collapsed cluster
      var l = gm[i] || (gm[i]=gn[i]) || (gm[i]={group:i, size:0, nodes:[]});
      if (l.size == 0) {
        // if new cluster, add to set and position at centroid of leaf nodes
        nm[i] = nodes.length;
        nodes.push(l);
        if (gc[i]) {
          l.x = gc[i].x / gc[i].count;
          l.y = gc[i].y / gc[i].count;
        }
      }
      l.size += 1;
      l.nodes.push(n);
    }
  }

  // determine links
  for (k=0; k<data.links.length; ++k) {
    var e = data.links[k],
        u = index(e.source),
        v = index(e.target);
    u = expand[u] ? nm[e.source.name] : nm[u];
    v = expand[v] ? nm[e.target.name] : nm[v];
    var i = (u<v ? u+"|"+v : v+"|"+u),
        l = lm[i] || (lm[i] = {source:u, target:v, size:0});
    l.size += 1;
  }
  for (i in lm) { links.push(lm[i]); }

  return {nodes: nodes, links: links};
}

function convexHulls(nodes, index, offset) {
  var h = {};

  // create point sets
  for (var k=0; k<nodes.length; ++k) {
    var n = nodes[k];
    if (n.size) continue;
    var i = index(n),
        l = h[i] || (h[i] = []);
    l.push([n.x-offset, n.y-offset]);
    l.push([n.x-offset, n.y+offset]);
    l.push([n.x+offset, n.y-offset]);
    l.push([n.x+offset, n.y+offset]);
  }

  // create convex hulls
  var hulls = [];
  for (i in h) {
    hulls.push({group: i, path: d3.geom.hull(h[i])});
  }

  return hulls;
}

function drawCluster(d) {
  return curve(d.path); // 0.8
}

// --------------------------------------------------------

var socket = io.connect('http://ec2-175-41-173-84.ap-southeast-1.compute.amazonaws.com:8080');
  socket.on('connect', function () {

    socket.on('link', function (l) {
      createlink(l.s, l.t);
    });
    
    socket.on('data', function (d) {
      data = d;
      data.nodes.forEach(function(n){expand[n.id] = true;});
      init();
    });
    socket.on('node', function(n) {
      newnode(n);
    });
  });



var selected = false;
var selectedShape = false;

function linked(s, t)
{
	return data.links.filter(function(l) { return (l.source == s && l.target == t)
														  || (l.source == t && l.target == s); });  
}

function createlink(sid, tid)
{
  s = getNode(sid);
  t = getNode(tid);
	if(!linked(s, t))
	{
	  data.links.push({source: s, target: t, size: 0});
	  init();
	}
}

function getNode(id)
{
  return data.nodes.filter(function(n){return id == n.id;})[0];
}

function addLink(s, t)
{
	link = linked(s, t);
	if(link.length > 0)
	{
		data.links.splice(data.links.indexOf(link[0]), 1);
	}
	else
	{
		createlink(s.id, t.id);
		socket.emit('link', {s:s.id, t:t.id});
		return true;
	}
	return false;
}

function deselect()
{
	if(selected)
	{
		selected = false;
		highlight(selectedShape, 1.5);
		selectedShape = false;
	}
}

function select(d, shape)
{
  selected = d;
  selectedShape = shape;
  highlight(shape, 3);
}

function highlight(shape, amnt)
{
	shape.style["stroke-width"] = amnt + "px";
}



init();

function init() {
  if (force) force.stop();

  net = network(data, net, getGroup, expand);
  
  w = vis[0][0].clientWidth
  h = vis[0][0].clientHeight

  force = d3.layout.force()
      .nodes(net.nodes)
      .links(net.links)
      .size([w, h])
      .linkDistance(settings.distance)
      .charge(settings.charge)
      .friction(1 - settings.friction)
      .gravity(settings.gravity/10)
      .linkStrength(settings.strength)
      .start();
      

  hullg.selectAll("path.hull").remove();
  hull = hullg.selectAll("path.hull")
     .data(convexHulls(net.nodes, getGroup, off))
    .enter().append("svg:path")
     .attr("class", "hull")
     .attr("d", drawCluster)
     .style("fill", function(d) { return fill(d.group); })
     .on("dblclick", function(d) { expand[d.group] = false; init(); })
     .on("mouseover", function(d) {
      	  if(selected)
      	  {
      	  	  this.style["stroke"] = "#fdd017";
      	  }
      	})
     .on("mouseout", function(d) {
      	  	  this.style["stroke"] = "none";
      	})
     .on("click", function(d) {
        if(selected)
        {
        	 d3.event.cancelBubble = true;
        	 selected.group = d.group;
        	 deselect();
          init();
        }
      });
     ;
     
       
  link = linkg.selectAll("line.link").data(net.links, linkid);
  link.exit().remove();
  link.enter().append("svg:line")
      .attr("class", "link")
      .attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return d.target.x; })
      .attr("y2", function(d) { return d.target.y; })
      .style("stroke-width", function(d) { return d.size || 1; });  
  link = linkg.selectAll("line.link");

  node = nodeg.selectAll("circle.node").data(net.nodes, nodeid);
  node.exit().remove();
  node.enter().append("svg:circle")
      .attr("class", function(d) { return "node" + (d.size?"":" leaf"); })
      .attr("r", function(d) { return d.size ? d.size + dr : dr+1; })
      .attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; })
      .style("fill", function(d) { return fill(d.group); })
      .on("mouseover", function(d) {
      	  if(selected != d)
      	  {
      	  	  highlight(this, 3);
      	  }
      	})
      .on("mouseout", function(d) {
      	  if(selected != d)
      	  {
      	  	  highlight(this, 1.5);
      	  }
      	})
      .on("dblclick", function(d) {
        if (d.size) { expand[d.group] = true; init(); }
      })
      .on("click", function(d) {
        d3.event.cancelBubble = true;
        if(selected)
        {
        	 addLink(selected, d);
        	 deselect();
        }
        else
        {
        	select(d, this);
        }
      });

  node = nodeg.selectAll("circle.node")
      .call(force.drag);

  force.on("tick", function() {
    if (!hull.empty()) {
      hull.data(convexHulls(net.nodes, getGroup, off))
          .attr("d", drawCluster);
    }

    link.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    node.attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });
  });
}
