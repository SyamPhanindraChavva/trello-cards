(function(){

  var trelloProject = {
    setPosition : false,
    defaultJson : {
                   "To-Do": {
                    "label": "To-Do",
                    "subLabel": []
                   },
                   "Currently Working":{
                    "label": "Currently Working",
                    "subLabel": []
                   },
                   "Completed":{
                    "label": "Completed",
                    "subLabel": []
                   }
                },

    init: function(){
      var trelloData = this.getData();
      jQuery('.board').html(this.createDefaultList(trelloData) + this.getAnotherListHtml());
      this.setWidth(Object.keys(trelloData).length +1 );
      this.setDragable();
      this.bindEvent();
    },

    createDefaultList: function(data){
      var html = '';
      for (var key in data) {
        var object = data[key], childContent = '', count = 0;
        var deleteButton = '<span class="list-delete-button glyphicon glyphicon-trash" >';
        if(['To-Do', 'Currently Working', 'Completed'].indexOf(key) !== -1){
          deleteButton = '';
        }  
        if(object.subLabel.length){
          for(var i=0; i<object.subLabel.length; i++){
            childContent += this.getCardHtml(object.subLabel[i]);
            count ++;
          }
        }
        var deleteTasks = '';
        if(childContent.length && key == 'Completed'){
          deleteTasks = '<input class="delete-tasks" type="button" value="Delete Tasks">';
        }
        
        var header = '<div class="list-header" name="'+ object.label +'"><h2>'+ object.label +' ('+ count +')</h2></span>'+ deleteTasks + deleteButton +'</div>';
        var bottom = '<a class="open-card-composer" href="#"><span class="plus-button glyphicon glyphicon-plus"></span><span class="add-card">Add a card</span><span class="add-another-card hide">Add another card</span></a>';
        var body ='<ul class="list-cards  js-sortable ui-sortable">' + childContent + '</ul><div class="new-card hide"><textarea class="list-card-composer-textarea" dir="auto" placeholder="Enter a title for this card"></textarea><div class="add-card-operation"><input class="primary card-add-button js-save-edit" type="submit" value="Add Card"><a class="card-close-button glyphicon glyphicon-remove" href="#"></a></div></div>';
        html += '<div class="list-wrapper"><div class="list">'+ (header + body + bottom) + '</div></div>' ;
      };
      return html;
    },

    getAnotherListHtml: function(){
      var plusButton = '<div class="new-list-button"><span class="plus-button glyphicon glyphicon-plus"></span><span>Add Another List</span></div>';
      var input = '<div class="new-list hide"><input class="list-name-input" type="text" name="name" placeholder="Enter list title..." autocomplete="off" dir="auto" maxlength="512"><div><input class="primary list-add-button js-save-edit" type="submit" value="Add List"><a class="list-close-button glyphicon glyphicon-remove" href="#"></a></div></div>';

      return '<div class="list-wrapper mod-add">'+ plusButton + input +'</div>';
    },

    setDragable: function(){
      jQuery(".js-sortable").sortable({
        connectWith: ".ui-sortable",
        stop: function(event, ui){
          if(trelloProject.setPosition){
            trelloProject.setPosition = false;
          }else{
            var data = trelloProject.getData();
            var cardName = ui.item.text();
            var listName = ui.item.parents('.list').find('.list-header').attr('name');
            data[listName].subLabel.splice(data[listName].subLabel.indexOf(cardName), 1);
            data[listName].subLabel.splice(ui.item.index(), 0, cardName);
            trelloProject.setData(data);
          }
        },
        receive: function(event,ui){
          var selectedCard = (ui.item).text();
          var receive = ui.item.parents('.list'), subLabel = [];
          var receiveLabel = receive.find('.list-header').attr('name');
          var senderLabel = ui.sender.parents('.list').find('.list-header').attr('name');
          var data = trelloProject.deleteCard(senderLabel, selectedCard);

          receive.find('ul li').each(function(){
            subLabel.push(jQuery(this).text());
          });
          data[receiveLabel].subLabel = subLabel;
          trelloProject.updateLabelCount(receiveLabel, subLabel.length);
          if(receiveLabel == 'Completed'){
            trelloProject.addDeleteTasksButton(receive);
          }else if(senderLabel == 'Completed' && !data[senderLabel].subLabel.length){
            jQuery('.delete-tasks').remove();
          }
          trelloProject.setData(data);
          trelloProject.setPosition = true;
        }
      }).disableSelection();
    },

    createNewCard: function(parent, label){
      var listName = parent.find('.list-header').attr('name');
      var li = trelloProject.getCardHtml(label);
      if(parent.find('ul li').length)
        parent.find('ul li:last').after(li);
      else
        parent.find('ul').append(li);
      if(listName == 'Completed')
      this.addDeleteTasksButton(parent);
      trelloProject.updateLocalStorage(listName, label);
      parent.find('.list-card-composer-textarea').val('');
    },

    createModal: function(element, isCard, label){
      var dialog = jQuery("#dialog-confirm");
      var title = 'Edit Card'; 
      if(!isCard){
        title = 'Delete List';
        dialog.find('#textarea').addClass('hide').end().find('p').removeClass('hide').find('b').text(label);
      }else{
        dialog.find('p').addClass('hide').end().find('#textarea').removeClass('hide').text(label);
      }
      jQuery("span.ui-dialog-title").text(title);
      dialog.attr('title', title);
      
      dialog.dialog({
        resizable: false,
        height: "auto",
        width: 400,
        modal: true,
        buttons: {
          "Update": function(){
            var updatedLabel = jQuery('#textarea').text();
            if(updatedLabel.length){
              if(isCard){      
                  trelloProject.updateCardName(element.parents('.list'), label, updatedLabel);
                  element.parent().text(updatedLabel);
                  jQuery(this).dialog("close");
              }
            }
          },
          "Delete": function(){
            var data = {};
            if(isCard){
              var parentLabel = element.parents('.list').find('.list-header').attr('name');
              data = trelloProject.deleteCard(parentLabel, label);
              element.parent().remove();
            }else{
              data = trelloProject.getData();
              delete data[label];
              trelloProject.setWidth(Object.keys(data).length + 1);
              element.parents('.list-wrapper').remove();
            }
            trelloProject.setData(data);
            jQuery(this).dialog("close");
          },
          Cancel: function() {
            jQuery(this).dialog("close");
          }
        }
      });
      if(!isCard){
        var updateButton = jQuery('.ui-dialog-buttonset button')[0];
        jQuery(updateButton).addClass('hide')
      }
    },

    bindEvent: function(){
      var doc = jQuery(document);
      doc.on('click', '.new-list-button, .list-close-button', function(){
        jQuery('.new-list-button, .new-list').toggleClass('hide');
        jQuery('.list-name-input').val('');
      });

      /* add a new list */
      doc.on('click', '.list-add-button', function(e){
        var label = (jQuery('.list-name-input').val()).trim();
        var data = trelloProject.getData();
        if(label.length){
          if(typeof(data[label]) == 'object'){
            alert("This label name is already present");
          }else{
            var obj = {"label": label,"subLabel": []};
            data[label] = obj;
            trelloProject.setWidth(Object.keys(data).length + 1);
            localStorage.setItem('defaultJson', JSON.stringify(data));
            jQuery(trelloProject.createDefaultList({label: obj})).insertBefore(".mod-add");
            jQuery('.list-close-button').click();
          }
        }
      });

      /* delete a list */
      doc.on('click', '.list-delete-button', function(e){
        var list = jQuery(this);
        trelloProject.createModal(list, false, list.parents('.list-wrapper').find('.list-header').attr('name'));
      });

      /* add a new card */
      doc.on('click', '.add-card', function(e){
        jQuery(this).parents('.list').find('.new-card, .open-card-composer').toggleClass('hide').end().find('.new-card .list-card-composer-textarea').val('');    
      });

      doc.on('click', '.card-close-button', function(e){
        jQuery(this).parents('.list').find('.new-card, .open-card-composer').toggleClass('hide');
      });

      doc.on('click', '.card-add-button', function(e){
        var parent = jQuery(this).parents('.list');
        var label = parent.find('.list-card-composer-textarea').val();        
        if(label.length){
          trelloProject.createNewCard(parent,label);         
        }
      });

      doc.on('click', '.edit-card', function(){
        var card = jQuery(this);
        trelloProject.createModal(card, true, card.parent().text());
      });

      doc.on('click', '.delete-tasks', function(){
        jQuery('#delete-tasks-confirm').removeClass('hide').dialog({resizable: false, height: "auto", width: 400, modal: true,
          buttons: {
            "Delete": function(){
              var data = trelloProject.getData();
              data['Completed'].subLabel = [];
              trelloProject.setData(data);
              trelloProject.updateLabelCount('Completed', 0);
              jQuery('.delete-tasks').parents('.list').find('ul').html('');
              jQuery('.delete-tasks').remove();
              jQuery(this).dialog("close");
            }, 
            "Cancel": function(){
              jQuery(this).dialog("close");
            }
          }
        });
        jQuery("span.ui-dialog-title").text("Delete All Tasks");
      });
    },

    setWidth: function(length){
      var width = "1440px";
      if(length * 288 > 1450){
        width = (length *288) + "px";
      }
      jQuery('.board').css('width', width);
    },

    addDeleteTasksButton: function(parent){
      if(!jQuery('.delete-tasks').length){
        parent.find('.list-header').html(parent.find('.list-header').html() + '<input class="delete-tasks" type="button" value="Delete Tasks">');
      }
    },  

    updateCardName: function(parent, label, updatedLabel){
      var listName = parent.find('.list-header').attr('name');
      var data = this.getData();
      data[listName].subLabel.splice(data[listName].subLabel.indexOf(label), 1, updatedLabel);
      trelloProject.setData(data);
    },

    updateLabelCount: function(listName, count){
      jQuery('[name="'+listName+'"] h2').text(listName + " ("+ count +")");
    },

    updateLocalStorage: function(listName, label){
      var data = this.getData();
      data[listName].subLabel.push(label);
      this.updateLabelCount(listName, data[listName].subLabel.length);
      this.setData(data);
    },

    deleteCard: function(listName, cardName){
      var data = trelloProject.getData();
      data[listName].subLabel.splice(data[listName].subLabel.indexOf(cardName), 1);
      this.updateLabelCount(listName, data[listName].subLabel.length);
      return data;
    },

    getCardHtml: function(card){
      return '<li class="list-card"><a class="edit-card glyphicon glyphicon-pencil"></a>' + card + '</li>';
    },

    getData: function(){
      if(localStorage.defaultJson == undefined){
        localStorage.setItem('defaultJson', JSON.stringify(trelloProject.defaultJson));
      }
      return JSON.parse(localStorage.defaultJson);  
    },

    setData: function(data){
      localStorage.setItem('defaultJson', JSON.stringify(data));
    }
  }

  jQuery(document).ready(function(){
    trelloProject.init();
  });
})();
