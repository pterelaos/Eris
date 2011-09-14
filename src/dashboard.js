(function(){
  
  //
  // the parameter-setting ui at the top of the screen
  //
  Dashboard = function(elt, sys){
    var dom = $(elt)
    
    var _ordinalize_re = /(\d)(?=(\d\d\d)+(?!\d))/g
    var ordinalize = function(num, hint){
      var norm = ""+num
      if (hint=="friction" || hint=="strength"){
        norm = Math.floor(100*num)+"%"
      }else {
      	if(num < 1 && num > 0)
      	{
      		norm = Math.round(num*100)/100;
      	}
      	else
      	{
          num = Math.round(num)
          if (num < 11000){
            norm = (""+num).replace(_ordinalize_re, "$1,")
          } else if (num < 1000000){
            norm = Math.floor(num/1000)+"k"
          } else if (num < 1000000000){
            norm = (""+Math.floor(num/1000)).replace(_ordinalize_re, "$1,")+"m"
          }
        }
      }
      return norm
    }
    
    var _ranges = {
      strength:[0,1],
      charge:[-500,500],
      friction:[0,1],
      distance:[0, 10000],
      scale:[1, 20],
      gravity:[0, 10]
    }
    
    var _state = null
    
    var that = {
      init:function(){
        // initialize the display with params from the particle system
        that.update()

        // click + drag on param values to modify them
        dom.find('.frob').mousedown(that.beginFrobbing)
        dom.find('img').mousedown(function(){  return false })
        dom.find('.toggle').click(that.toggleGravity)

        return that
      },
      
      update:function(){
        $.each(sys.parameters(), function(param, val){
          //if (param=='gravity'){
          //  dom.find('.gravity .toggle').text(val?"Center":"Off")
          //}else{
            dom.find('li.'+param).find('.frob')
                                 .text(ordinalize(val, param))
                                 .data("param",param)
                                 .data("val",val)
          //}
          
        })
      },
      
      toggleGravity:function(e){
        var oldGravity = sys.parameters().gravity
        sys.parameters({gravity:!oldGravity})
        that.update()
      },
      
      beginFrobbing:function(e){
        var frob = $(e.target)
        var param = frob.data('param')
        var val = frob.data('val')
        var max = _ranges[param][1]
        var min = _ranges[param][0]
        var prop = (param=='friction') ? val/max : (Math.log((val-min)/(max-min))/Math.PI + Math.PI)/Math.PI

        if (val/max > ((param=='friction') ? .9 : .333)) frob.addClass('huge')
        if (val/max <= ((param=='friction') ? .4 : .05)) frob.addClass('tiny')

        _state = {
          origin:e.pageX,
          elt:frob,
          param:param,
          val:val,
          prop:prop,
          max:max,
          min:min
        }
        $('html').addClass('adjusting')
        frob.addClass('adjusting')

        $(window).bind('mousemove',that.stillFrobbing)
        $(window).bind('mouseup',that.doneFrobbing)

        return false
      },
      stillFrobbing:function(e){
        if (!_state) return false

        // slide over the param space with a nice exponential step size
        var disp = _state.prop + (e.pageX-_state.origin) / 1000
        if (_state.param=='friction' || _state.param == 'strength'){
          var new_prop = Math.max(0, Math.min(1, disp ))
        }else{
          var new_prop = Math.exp(Math.PI*(Math.PI*(disp)-Math.PI))
          new_prop = Math.max(0, Math.min(1, new_prop ))
        }
        var new_val = (_state.max-_state.min) * new_prop + _state.min
        if (new_prop%1==0){
           _state.origin = e.pageX
           _state.prop = new_prop
        }
        
        if (new_prop > ((_state.param=='friction') ? .9 : .333)) _state.elt.addClass('huge')
        else _state.elt.removeClass('huge')

        if (new_prop <= ((_state.param=='friction') ? .4 : .05)) _state.elt.addClass('tiny')
        else _state.elt.removeClass('tiny')

        // update the display
        _state.elt.text(ordinalize(new_val, _state.param))
                  .data('val', new_val)
        
        // let the particle system know about the change
        var new_param = {}
        new_param[_state.param] = new_val
        sys.parameters(new_param)
        
        return false
      },
      doneFrobbing:function(e){
        $(window).unbind('mousemove',that.stillFrobbing)
        $(window).unbind('mouseup',that.doneFrobbing)
        
        $('html').removeClass('adjusting')
        _state.elt.removeClass('adjusting')
        _state.elt.removeClass('huge')
        _state.elt.removeClass('tiny')
        _state = null
        return false
      }
    }
    
    return that.init()    
  }
  
  
})()