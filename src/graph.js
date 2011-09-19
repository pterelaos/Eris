define(function () {

    function _init()
    {
        var _data = {nodes: [], links: [], groups: []};
	var _nextid = 0;

	function _addGroup(g)
	{
	    _data.groups.push(g);
	}

	function _deleteLinks(links)
	{
	    links.forEach(_deleteLink);
	}

	function _deleteLink(link)
	{
	    i = _data.links.indexOf(link);
	    if(i >= 0)
	    {
		_data.links.splice(i, 1);
	    }
	}

	function _getLinks(n1, n2)
	{
	    return _data.links.filter(function(l) {
		return (l.source == n1 && l.target == n2)
		    || (l.source == n2 && l.target == n1);
	    });
	}

	function _addNode(node)
	{
	    if(node)
		_data.nodes[node.id] = node;
	}

	function _getNode(id)
	{
//	    return  filterById(_data.nodes, id)[0];
	    return _data.nodes[id];
	}

	function _getGroup(id)
	{
	    return filterById(_data.groups, id)[0];
	}

	function filterById(arr, id)
	{
	    return arr.filter(function(e){return e.id == id;});
	}

        function _createLink(node1Id, node2Id)
	{
	    var n1 = _getNode(node1Id);
	    var n2 = _getNode(node2Id);
	    var links = _getLinks(node1Id, node2Id);
	    if(links.length > 0) {
		_deleteLinks(links);
	    }
	    else {
		_data.links.push({source: n1.id, target: n2.id, size: 0});
	    }
	}

	function _addToGroup(nodeId, gid)
	{
	    var n = _getNode(nodeId);
	    var g = _getGroup(gid);
	    if(n && g)
	    {
		if(n.group == gid) n.group = false;
		else n.group = gid;
	    }
	}

	function _buildAction(name)
	{
	    var args = [];
	    for(var i = 1;i<arguments.length;++i)
		args.push(arguments[i]);
	    return [{name:name, params:args}];
	}

	var _baseActions = {
	    nextId : 0,

	    createGroup: function(x, y)
	    {
		var gid = "" + _nextid++;
		var g = {x:x, y:y,
			 id:gid, name:gid,
			 strength:0.8,
			 group:false,
			 visible:true,
			 isgroup:true};
		return _buildAction("addGroup", g);
	    },
	    createNode: function(xval, yval)
	    {
		var nid = _nextid++;
		var n = {x:xval, y:yval, name:nid, id:nid, group:false, size:1, visible:true};
		return _buildAction('addNode', n);
	    },
	    editNode: function(nodeid, param, value)
	    {
		if(_getNode(nodeid))
		    return _buildAction('editNode', nodeid, param, value);
		return false;
	    },
	    editGroup: function(id, param, value)
	    {
		if(_getGroup(id))
		    return _buildAction('editGroup', id, param, value);
		return false;
	    },
	    createLink: function(node1Id, node2Id)
	    {
		if(node1Id != node2Id && _getNode(node1Id) && _getNode(node2Id)) {
		    return _buildAction("addLink", node1Id, node2Id);
		}
		return false;
	    },
	    addToGroup: function(nodeId, groupId)
	    {
		if(_getNode(nodeId) && _getGroup(groupId))
		{
		    return _buildAction('addToGroup', nodeId, groupId);
		}
		return false;
	    },
	    setParent: function(child, parent)
	    {
		if(_getGroup(child) && _getGroup(parent) && child != parent)
		    return _buildAction('setParent', child, parent);
		return false;
	    }
	 };

	var _client = {
	    addGroup: _addGroup,
	    addLink: _createLink,
	    addNode: _addNode,
	    addToGroup: _addToGroup,
	    setParent: function(cid, pid)
	    {
		var child = _getGroup(cid),
		parent = _getGroup(pid);
		if(child)
		{
		    child.group = child.group == pid ? false : pid;
		}
	    },
	    editNode: function(id, param, value)
	    {
		var n = _getNode(id);
		if(n)
		    n[param] = value;
	    },
	    editGroup: function(gid, param, value)
	    {
		var g = _getGroup(gid);
		if(g) g[param] = value;
	    }
	};

	function perform(actions, action)
	{
	    if(action && action.length > 0)
	    {
		var ret = [];
		action.forEach(function(a) {
		    var res = actions[a.name].apply(actions, a.params);
		    if(res){
			res.forEach(function(e){ret.push(e);});
		    }
		});
		if(ret.length > 0)
		    return ret;
	    }
	    return false;
	}

	return {
	    data: _data,
	    baseAction: function(action)
	    {
		var res = perform(_baseActions, action);
		this.clientAction(res);
		return res;
	    },
	    clientAction: function(action)
	    {
		return perform(_client, action);
	    },
	    setData: function(newData)
	    {
		_data = newData;
		this.data = _data;
	    },
	    buildAction: _buildAction,
	    getGroup:_getGroup
	};
    }

    return {init:_init};

});
