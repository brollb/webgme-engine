"use strict";

define(['js/Constants',
    'js/NodePropertyNames',
    'js/RegistryKeys',
    '../../DefaultDecorator/DiagramDesigner/DefaultDecorator.DiagramDesignerWidget',
    'text!./MetaDecorator.DiagramDesignerWidget.html',
    './Attribute',
    './AttributeDetailsDialog',
    'js/Panels/MetaEditor/MetaRelations',
    './MetaDecorator.DiagramDesignerWidget.Constraints',
    './MetaDecorator.DiagramDesignerWidget.Aspects',
    './MetaTextEditorDialog',
    'css!./MetaDecorator.DiagramDesignerWidget'], function (CONSTANTS,
                                                          nodePropertyNames,
                                                          REGISTRY_KEYS,
                                                          DefaultDecoratorDiagramDesignerWidget,
                                                          MetaDecoratorTemplate,
                                                          Attribute,
                                                          AttributeDetailsDialog,
                                                          MetaRelations,
                                                          MetaDecoratorDiagramDesignerWidgetConstraints,
                                                          MetaDecoratorDiagramDesignerWidgetAspects,
                                                          MetaTextEditorDialog) {

    var MetaDecoratorDiagramDesignerWidget,
        DECORATOR_ID = "MetaDecorator",
        ABSTRACT_CLASS = 'abstract';

    MetaDecoratorDiagramDesignerWidget = function (options) {

        var opts = _.extend( {}, options);

        DefaultDecoratorDiagramDesignerWidget.apply(this, [opts]);

        this.name = "";
        this._attributeNames = [];
        this._attributes = {};
        this._skinParts = { "$name": undefined,
                            "$attributesContainer": undefined,
                            "$addAttributeContainer": undefined,
                            "$constraintsContainer": undefined,
                            "$addConstraintContainer": undefined,
                            "$aspectsContainer": undefined,
                            "$addAspectContainer": undefined};

        this.logger.debug("MetaDecorator ctor");
    };

    _.extend(MetaDecoratorDiagramDesignerWidget.prototype, DefaultDecoratorDiagramDesignerWidget.prototype);
    MetaDecoratorDiagramDesignerWidget.prototype.DECORATORID = DECORATOR_ID;
    _.extend(MetaDecoratorDiagramDesignerWidget.prototype, MetaDecoratorDiagramDesignerWidgetConstraints.prototype);
    _.extend(MetaDecoratorDiagramDesignerWidget.prototype, MetaDecoratorDiagramDesignerWidgetAspects.prototype);

    /*********************** OVERRIDE DECORATORBASE MEMBERS **************************/

    MetaDecoratorDiagramDesignerWidget.prototype.$DOMBase = $(MetaDecoratorTemplate);

    MetaDecoratorDiagramDesignerWidget.prototype.on_addTo = function () {
        var self = this;

        this._renderContent();

        // set title editable on double-click
        this._skinParts.$name.on("dblclick.editOnDblClick", null, function (event) {
            if (self.hostDesignerItem.canvas.getIsReadOnlyMode() !== true) {
                $(this).editInPlace({"class": "",
                    "onChange": function (oldValue, newValue) {
                        self._onNodeTitleChanged(oldValue, newValue);
                    }});
            }
            event.stopPropagation();
            event.preventDefault();
        });

        //set the "Add new..." clickhandler
        this._skinParts.$addAttributeContainer.on("click", null, function (event) {
            if (self.hostDesignerItem.canvas.getIsReadOnlyMode() !== true) {
                self._onNewAttributeClick();
            }
            event.stopPropagation();
            event.preventDefault();
        });
    };

    MetaDecoratorDiagramDesignerWidget.prototype._renderContent = function () {
        var client = this._control._client,
            self = this;

        //render GME-ID in the DOM, for debugging
        this.$el.attr({"data-id": this._metaInfo[CONSTANTS.GME_ID]});

        /* BUILD UI*/
        //find name placeholder
        this._skinParts.$name = this.$el.find(".name");
        this._skinParts.$attributesContainer = this.$el.find(".attributes");
        this._skinParts.$addAttributeContainer = this.$el.find(".add-new-attribute");

        this._skinParts.$attributesContainer.on('dblclick', 'li', function (e) {
            if (self.hostDesignerItem.canvas.getIsReadOnlyMode() !== true) {
                var attrName = $(this).find('.n').text().replace(":", ""),
                    attrNames,
                    dialog = new AttributeDetailsDialog(),
                    atrMeta = client.getAttributeSchema(self._metaInfo[CONSTANTS.GME_ID],attrName);
                var desc = _.extend({},{name:attrName,type:atrMeta.type,defaultValue:atrMeta.default});
                if(atrMeta.enum && atrMeta.enum.length >0){
                    desc.isEnum = true;
                    desc.enumValues = [];
                    for(var i=0;i<atrMeta.enum.length;i++){
                        desc.enumValues.push(atrMeta.enum[i]);
                    }
                } else {
                    desc.isMeta = false;
                }

                //pass all the other attribute names to the dialog
                attrNames = client.getValidAttributeNames(self._metaInfo[CONSTANTS.GME_ID]);
                attrNames.splice(attrNames.indexOf(attrName), 1);

                dialog.show(desc, attrNames, function (attrDesc) {
                        self.saveAttributeDescriptor(attrName, attrDesc);
                    },
                    function () {
                        self.deleteAttributeDescriptor(attrName);
                    }
                );
            }

            e.stopPropagation();
            e.preventDefault();
        });

        //call the Constraint's extension's init render code
        this._renderContentConstraints();

        //call the Aspect's extension's init render code
        this._renderContentAspects();

        //render text-editor based META editing UI piece
        this._skinParts.$textMetaEditorBtn = $('<i class="icon-cog text-meta"></i>');
        this.$el.append(this._skinParts.$textMetaEditorBtn);
        this._skinParts.$textMetaEditorBtn.on('click', function (event) {
            if (self.hostDesignerItem.canvas.getIsReadOnlyMode() !== true) {
               self._showMetaTextEditorDialog();
            }
            event.stopPropagation();
            event.preventDefault();
        });

        if (this.hostDesignerItem.canvas.getIsReadOnlyMode() === true) {
            this._skinParts.$addAttributeContainer.detach();
            this._skinParts.$addConstraintContainer.detach();
            this._skinParts.$addAspectContainer.detach();
        }

        this.update();
    };

    MetaDecoratorDiagramDesignerWidget.prototype.update = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            newName = "";

        if (nodeObj) {
            newName = nodeObj.getAttribute(nodePropertyNames.Attributes.name) || "";

            if (this.name !== newName) {
                this.name = newName;
                this._refreshName();
            }

            this._updateColors();
            this._updateAttributes();
            this._updateConstraints();
            this._updateAbstract();
            this._updateAspects();
        }
    };

    MetaDecoratorDiagramDesignerWidget.prototype._updateColors = function () {
        this._getNodeColorsFromRegistry();

        if (this.fillColor) {
            this.$el.css({'background-color': this.fillColor});
        } else {
            this.$el.css({'background-color': ''});
        }

        if (this.borderColor) {
            this.$el.css({'border-color': this.borderColor});
            this._skinParts.$name.css({'border-color': this.borderColor});
        } else {
            this.$el.css({'border-color': '',
                'box-shadow': ''});
            this._skinParts.$name.css({'border-color': ''});
        }

        if (this.textColor) {
            this.$el.css({'color': this.textColor});
        } else {
            this.$el.css({'color': ''});
        }
    };

    MetaDecoratorDiagramDesignerWidget.prototype._getNodeColorsFromRegistry = function () {
        var objID = this._metaInfo[CONSTANTS.GME_ID];

        this.fillColor = this.preferencesHelper.getRegistry(objID, REGISTRY_KEYS.COLOR, false);
        this.borderColor = this.preferencesHelper.getRegistry(objID, REGISTRY_KEYS.BORDER_COLOR, false);
        this.textColor = this.preferencesHelper.getRegistry(objID, REGISTRY_KEYS.TEXT_COLOR, false);
    };

    MetaDecoratorDiagramDesignerWidget.prototype._refreshName = function () {
        this._skinParts.$name.text(this.name);
        this._skinParts.$name.attr("title", this.name);
    };

    MetaDecoratorDiagramDesignerWidget.prototype._updateAbstract = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]);

        if (nodeObj) {
            if (nodeObj.getRegistry(REGISTRY_KEYS.IS_ABSTRACT) === true) {
                this.$el.addClass(ABSTRACT_CLASS);
            } else {
                this.$el.removeClass(ABSTRACT_CLASS);
            }
        } else {
            this.$el.removeClass(ABSTRACT_CLASS);
        }
    };

    /***************  CUSTOM DECORATOR PART ****************************/
    MetaDecoratorDiagramDesignerWidget.prototype._updateAttributes = function () {
        var client = this._control._client,
            newAttributes = client.getOwnValidAttributeNames(this._metaInfo[CONSTANTS.GME_ID]),
            len,
            displayedAttributes = this._attributeNames.slice(0),
            diff,
            attrLIBase = $('<li/>'),
            i;

        //first get the ones that are not there anymore
        diff = _.difference(displayedAttributes, newAttributes);
        len = diff.length;
        while (len--) {
            this._removeAttribute(diff[len]);
        }

        //second get the ones that are new
        diff = _.difference(newAttributes, displayedAttributes);
        len = diff.length;
        while (len--) {
            this._addAttribute(diff[len]);
        }

        //finally update UI
        this._attributeNames.sort();
        this._skinParts.$attributesContainer.empty();
        len = this._attributeNames.length;
        for (i = 0; i < len; i += 1) {
            this._skinParts.$attributesContainer.append(attrLIBase.clone().append(this._attributes[this._attributeNames[i]].$el));
        }


    };

    MetaDecoratorDiagramDesignerWidget.prototype._addAttribute = function (attrName) {
        var client = this._control._client,
            attrMetaDescriptor = client.getAttributeSchema(this._metaInfo[CONSTANTS.GME_ID],attrName) ? {name:attrName,type:client.getAttributeSchema(this._metaInfo[CONSTANTS.GME_ID],attrName).type || "null"} : null;

        if (attrMetaDescriptor) {
            this._attributes[attrName] = new Attribute(attrMetaDescriptor);
            this._attributeNames.push(attrName);
        }
    };


    MetaDecoratorDiagramDesignerWidget.prototype._removeAttribute = function (attrName) {
        var idx = this._attributeNames.indexOf(attrName);

        if (idx !== -1) {
            this._attributes[attrName].destroy();
            delete this._attributes[attrName];
            this._attributeNames.splice(idx, 1);
        }
    };


    MetaDecoratorDiagramDesignerWidget.prototype.destroy = function () {
        var len = this._attributeNames.length;
        while (len--) {
            this._removeAttribute(this._attributeNames[len]);
        }
    };

    /**************** EDIT NODE TITLE ************************/

    MetaDecoratorDiagramDesignerWidget.prototype._onNodeTitleChanged = function (oldValue, newValue) {
        var client = this._control._client;

        client.setAttributes(this._metaInfo[CONSTANTS.GME_ID], nodePropertyNames.Attributes.name, newValue);
    };

    /**************** END OF - EDIT NODE TITLE ************************/

    /**************** CREATE NEW ATTRIBUTE ********************/

    MetaDecoratorDiagramDesignerWidget.prototype._onNewAttributeClick = function () {
        var client = this._control._client,
            objId = this._metaInfo[CONSTANTS.GME_ID];
        this._onNewClick(client.getValidAttributeNames(objId), this._skinParts.$attributesContainer, this._skinParts.$addAttributeContainer, this._onNewAttributeCreate);
    };

    MetaDecoratorDiagramDesignerWidget.prototype._onNewClick = function (existingNames, itemContainer, addNewContainer, saveFn) {
        var inputCtrl,
            w = itemContainer.width(),
            cancel,
            save,
            endEdit,
            self = this,
            ctrlGroup;

        addNewContainer.detach();

        endEdit = function () {
            ctrlGroup.remove();
            addNewContainer.insertAfter(itemContainer);
        };

        cancel = function () {
            endEdit();
        };

        save = function () {
            var attrName = inputCtrl.val();

            if (self._isValidName(attrName, existingNames)) {
                //call onNewAttrCreate
                if (_.isFunction(saveFn)) {
                    saveFn.call(self, attrName);
                }
                //call finish
                endEdit();
            }
        };

        ctrlGroup = $("<div/>",
                    {"class": "control-group"});

        inputCtrl = $("<input/>", {
                    "type": "text",
                    "class": "new-attr"});

        inputCtrl.outerWidth(w);
        inputCtrl.css({"box-sizing": "border-box",
                    "margin": "0px"});

        ctrlGroup.append(inputCtrl);

        ctrlGroup.insertAfter(itemContainer);

        //finally put the control in focus
        inputCtrl.focus();

        //hook up event handlers to 'save' and 'cancel'
        inputCtrl.keydown(
            function (event) {
                switch (event.which) {
                    case 27: // [esc]
                        // discard changes on [esc]
                        inputCtrl.val('');
                        event.preventDefault();
                        event.stopPropagation();
                        cancel();
                        break;
                    case 13: // [enter]
                        // simulate blur to accept new value
                        event.preventDefault();
                        event.stopPropagation();
                        save();
                        break;
                    case 46:// DEL
                        //don't need to handle it specially but need to prevent propagation
                        event.stopPropagation();
                        break;
                }
            }
        ).keyup( function (/*event*/) {
            if (self._isValidName(inputCtrl.val(), existingNames)) {
                ctrlGroup.removeClass("error");
            } else {
                ctrlGroup.addClass("error");
            }
        }).blur(function (/*event*/) {
            cancel();
        });
    };


    MetaDecoratorDiagramDesignerWidget.prototype._onNewAttributeCreate = function (attrName) {
        var desc,
            self = this,
            attrNames = this._attributeNames.slice(0),
            dialog = new AttributeDetailsDialog();

        this.logger.debug("_onNewAttributeCreate: " + attrName);

        //pass all the other attribute names to the dialog
        attrNames.splice(this._attributeNames.indexOf(attrName), 1);

        desc = {'name': attrName,
            'type': 'string',
            'isEnum': false };

        dialog.show(desc, attrNames, function (attrDesc) {
            self.saveAttributeDescriptor(attrName, attrDesc);
        });
    };

    MetaDecoratorDiagramDesignerWidget.prototype._isValidName = function (attrName, collection) {
        var result = true;

        if (attrName === '' ||
            typeof attrName !== 'string' ||
            collection.indexOf(attrName) !== -1) {
            result = false;
        }

        return result;
    };

    MetaDecoratorDiagramDesignerWidget.prototype.readOnlyMode = function (readOnlyMode) {
        DefaultDecoratorDiagramDesignerWidget.prototype.readOnlyMode.call(this, readOnlyMode);

        this._setReadOnlyMode(readOnlyMode);
    };

    MetaDecoratorDiagramDesignerWidget.prototype._setReadOnlyMode = function (readOnly) {
        if (readOnly === true) {
            this._skinParts.$addAttributeContainer.detach();
            this._skinParts.$addConstraintContainer.detach();
            this._skinParts.$addAspectContainer.detach();
            this.$el.find('input.new-attr').val('').blur();
        } else {
            this._skinParts.$addAttributeContainer.insertAfter(this._skinParts.$attributesContainer);
            this._skinParts.$addConstraintContainer.insertAfter(this._skinParts.$constraintsContainer);
            this._skinParts.$addAspectContainer.insertAfter(this._skinParts.$aspectsContainer);
        }
    };

    MetaDecoratorDiagramDesignerWidget.prototype.saveAttributeDescriptor = function (attrName, attrDesc) {
        var client = this._control._client,
            objID = this._metaInfo[CONSTANTS.GME_ID],
            attrSchema;

        client.startTransaction();

        //this.logger.warning('saveAttributeDescriptor: ' + name + ', attrDesc: ' + JSON.stringify(attrDesc));
        //if this is an attribute rename
        if (attrName !== attrDesc.name) {
            //name has changed --> delete the descriptor with the old name
            //TODO: as of now we have to create an alibi attribute instance with the same name
            //TODO: just because of this hack, make sure that the name is not overwritten
            //TODO: just because of this hack, delete the alibi attribute as well
            if (attrName !== nodePropertyNames.Attributes.name)
            {
                client.removeAttributeSchema(objID,attrName);
                client.delAttributes(objID, attrName);
            }

            //set the new name to attrName
            attrName = attrDesc.name;
        }


        //TODO: as of now we have to create an alibi attribute instance with the same name
        //TODO: just because of this hack, make sure that the name is not overwritten
        if (attrName !== nodePropertyNames.Attributes.name)
        {
            attrSchema = {"type":attrDesc.type,"default":attrDesc.defaultValue};
            if(attrDesc.isEnum){
                attrSchema.enum = attrDesc.enumValues;
            }
            client.setAttributeSchema(objID,attrName,attrSchema);
            client.setAttributes(objID, attrName, attrDesc.defaultValue);
        }

        client.completeTransaction();
    };

    MetaDecoratorDiagramDesignerWidget.prototype.deleteAttributeDescriptor = function (attrName) {
        var client = this._control._client,
            objID = this._metaInfo[CONSTANTS.GME_ID];

        client.startTransaction();

        //TODO: as of now we have to create an alibi attribute instance with the same name
        //TODO: just because of this hack, make sure that the name is not overwritten
        //TODO: just because of this hack, delete the alibi attribute as well
        if (attrName !== nodePropertyNames.Attributes.name)
        {
            client.removeAttributeSchema(objID,attrName);
            client.delAttributes(objID, attrName);
        }

        client.completeTransaction();
    };

    /********* END OF --- ATTRIBUTES **************************************/


    MetaDecoratorDiagramDesignerWidget.prototype.getConnectionAreas = function (id, isEnd, connectionMetaInfo) {
        var result = [],
            edge = 10,
            LEN = 20,
            connType = connectionMetaInfo && connectionMetaInfo[MetaRelations.CONNECTION_META_INFO.TYPE] ? connectionMetaInfo[MetaRelations.CONNECTION_META_INFO.TYPE] : null,
            cN,
            cE,
            cW,
            cS,
            disabledAreas = this._getDisabledConnectionAreas();

        //by default return the bounding box edge's midpoints

        if (id === undefined || id == this.hostDesignerItem.id) {
            //NORTH
            cN = {"id": "0",
                "x1": edge,
                "y1": 0,
                "x2": this.hostDesignerItem.getWidth() - edge,
                "y2": 0,
                "angle1": 270,
                "angle2": 270,
                "len": LEN};

            //EAST
            cE = {"id": "1",
                "x1": this.hostDesignerItem.getWidth(),
                "y1": edge,
                "x2": this.hostDesignerItem.getWidth(),
                "y2": this.hostDesignerItem.getHeight() - edge,
                "angle1": 0,
                "angle2": 0,
                "len": LEN};

            //SOUTH
            cS = {"id": "2",
                "x1": edge,
                "y1": this.hostDesignerItem.getHeight(),
                "x2": this.hostDesignerItem.getWidth() - edge,
                "y2": this.hostDesignerItem.getHeight(),
                "angle1": 90,
                "angle2": 90,
                "len": LEN};

            //WEST
            cW = {"id": "3",
                "x1": 0,
                "y1": edge,
                "x2": 0,
                "y2": this.hostDesignerItem.getHeight() - edge,
                "angle1": 180,
                "angle2": 180,
                "len": LEN};

            if (connType && connType === MetaRelations.META_RELATIONS.INHERITANCE) {
                //if the connection is inheritance
                //it can be NORTH only if destination
                //it can be SOUTH only if source
                if (isEnd) {
                    //north is not disabled, use north only
                    //otherwise use all
                    if (disabledAreas.indexOf(cN.id) === -1) {
                        result.push(cN);
                    } else {
                        result.push(cE);
                        result.push(cS);
                        result.push(cW);
                    }
                } else {
                    //south is not disabled, use south only
                    //otherwise use all
                    if (disabledAreas.indexOf(cS.id) === -1) {
                        result.push(cS);
                    } else {
                        result.push(cN);
                        result.push(cE);
                        result.push(cW);
                    }
                }
            } else {
                result.push(cN);
                result.push(cE);
                result.push(cS);
                result.push(cW);
            }
        }

        return result;
    };

    MetaDecoratorDiagramDesignerWidget.prototype._showMetaTextEditorDialog = function () {
        var client = this._control._client,
            dialog = new MetaTextEditorDialog(),
            metaObj = client.getMeta(this._metaInfo[CONSTANTS.GME_ID]),
            self = this;

        dialog.show(JSON.stringify(metaObj, undefined, 2), function (text) {
                try {
                    var newMetaObj = JSON.parse(text);
                    client.setMeta(self._metaInfo[CONSTANTS.GME_ID], newMetaObj);
                } catch (e) {
                    self.logger.error('Saving META failed... Either not JSON object or something else went wrong...');
                }
            });
    };

    return MetaDecoratorDiagramDesignerWidget;
});