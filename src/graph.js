define(function () {

    function _init()
    {
        var _data = {nodes: [], links: [], groups: []};

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
	    _data.nodes.push(node);
	}

	function _getNode(id)
	{
	    return  filterById(_data.nodes, id)[0];
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
	    var links = _getLinks(n1, n2);
	    if(links.length > 0) {
		_deleteLinks(links);
	    }
	    else {
		_data.links.push({source: n1, target: n2, size: 0});
	    }
	}

	function _addToGroup(nodeId, gid)
	{
	    var n = _getNode(nodeId);
	    var g = _getGroup(gid);
	    if(n && g)
	    {
		var i = n.groups.indexOf(gid);
		if(i >= 0)
		{
		    n.groups.splice(i, 1);
		}
		else
		{
		    n.groups.push(gid);
		}
	    }
	}

	var _baseActions = {
	    nextId : 0,

	    createGroup: function()
	    {
		var gid = this.nextid++;
		var g = {id:gid, name:gid, gravity:true};
		return {name:"addGroup", params:[g]};
	    },
	    createNode: function(x, y)
	    {
		var nid = this.nextid++;
		var n = {x:y, y:y, name:nid, id:nid, groups:[]};
	    },
	    createLink: function(node1Id, node2Id)
	    {
		if(node1Id != node2Id) {
		    return {name:"addLink", params:[node1Id, node2Id]};
		}
		return false;
	    },
	    addToGroup: function(nodeId, groupId)
	    {
		return {name:'addToGroup', params:[nodeId, groupId]};
	    }
	 };

	var _clientActions = {
	    addGroup: _addGroup,
	    addLink: _createLink,
	    addNode: _addNode,
	    addToGroup: _addToGroup
	};

	function perform(actions, action)
	{
	    if(action)
	    {
		return actions[action.name].apply(action.params);
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
		return perform(_clientActions, action);
	    },
	    setData: function(newData)
	    {
		_data = newData;
		this.data = _data;
	    }
	};
    }

    return {init:_init};

});
