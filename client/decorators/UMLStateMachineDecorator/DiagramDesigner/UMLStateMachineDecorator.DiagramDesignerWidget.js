/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['js/Constants',
    'js/NodePropertyNames',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.DecoratorBase',
    './../Core/UMLStateMachineDecoratorCore',
    'css!./UMLStateMachineDecorator.DiagramDesignerWidget'], function (CONSTANTS,
                                                               nodePropertyNames,
                                                               DiagramDesignerWidgetDecoratorBase,
                                                               UMLStateMachineDecoratorCore) {

    var UMLStateMachineDecoratorDiagramDesignerWidget,
        DECORATOR_ID = "UMLStateMachineDecoratorDiagramDesignerWidget";

    UMLStateMachineDecoratorDiagramDesignerWidget = function (options) {
        var opts = _.extend( {}, options);

        DiagramDesignerWidgetDecoratorBase.apply(this, [opts]);

        this._initializeDecorator({"connectors": true});

        this.logger.debug("UMLStateMachineDecoratorDiagramDesignerWidget ctor");
    };

    /************************ INHERITANCE *********************/
    _.extend(UMLStateMachineDecoratorDiagramDesignerWidget.prototype, DiagramDesignerWidgetDecoratorBase.prototype);
    _.extend(UMLStateMachineDecoratorDiagramDesignerWidget.prototype, UMLStateMachineDecoratorCore.prototype);


    /**************** OVERRIDE INHERITED / EXTEND ****************/

    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    UMLStateMachineDecoratorDiagramDesignerWidget.prototype.DECORATORID = DECORATOR_ID;


    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    UMLStateMachineDecoratorDiagramDesignerWidget.prototype.on_addTo = function () {
        var self = this;

        this._renderContent();

        // set title editable on double-click
        /*this.skinParts.$name.on("dblclick.editOnDblClick", null, function (event) {
            if (self.hostDesignerItem.canvas.getIsReadOnlyMode() !== true) {
                $(this).editInPlace({"class": "",
                    "onChange": function (oldValue, newValue) {
                        self._onNodeTitleChanged(oldValue, newValue);
                    }});
            }
            event.stopPropagation();
            event.preventDefault();
        });*/
    };


    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    UMLStateMachineDecoratorDiagramDesignerWidget.prototype.showSourceConnectors = function (params) {
        this.$sourceConnectors.appendTo(this.$el.find('> div').first());
    };

    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    UMLStateMachineDecoratorDiagramDesignerWidget.prototype.showEndConnectors = function (params) {
        this.$endConnectors.appendTo(this.$el.find('> div').first());
    };

    UMLStateMachineDecoratorDiagramDesignerWidget.prototype._renderName = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]);

        //render GME-ID in the DOM, for debugging
        /*this.$el.attr({"data-id": this._metaInfo[CONSTANTS.GME_ID]});

        if (nodeObj) {
            this.name = nodeObj.getAttribute(nodePropertyNames.Attributes.name) || "";
        }

        //find name placeholder
        this.skinParts.$name = this.$el.find(".name");
        this.skinParts.$name.text(this.name);*/
    };


    UMLStateMachineDecoratorDiagramDesignerWidget.prototype.getConnectionAreas = function (id, isEnd, connectionMetaInfo) {
        var result = [],
            edge = 10,
            LEN = 20;

        //by default return the bounding box edge's midpoints

        if (id === undefined || id == this.hostDesignerItem.id) {
            //NORTH
            result.push( {"id": "0",
                "x1": edge,
                "y1": 0,
                "x2": this.hostDesignerItem.getWidth() - edge,
                "y2": 0,
                "angle1": 270,
                "angle2": 270,
                "len": LEN} );

            //EAST
            result.push( {"id": "1",
                "x1": this.hostDesignerItem.getWidth(),
                "y1": edge,
                "x2": this.hostDesignerItem.getWidth(),
                "y2": this.hostDesignerItem.getHeight() - edge,
                "angle1": 0,
                "angle2": 0,
                "len": LEN} );

            //SOUTH
            result.push( {"id": "2",
                "x1": edge,
                "y1": this.hostDesignerItem.getHeight(),
                "x2": this.hostDesignerItem.getWidth() - edge,
                "y2": this.hostDesignerItem.getHeight(),
                "angle1": 90,
                "angle2": 90,
                "len": LEN} );

            //WEST
            result.push( {"id": "3",
                "x1": 0,
                "y1": edge,
                "x2": 0,
                "y2": this.hostDesignerItem.getHeight() - edge,
                "angle1": 180,
                "angle2": 180,
                "len": LEN} );
        }

        return result;
    };




    /**************** EDIT NODE TITLE ************************/

    UMLStateMachineDecoratorDiagramDesignerWidget.prototype._onNodeTitleChanged = function (oldValue, newValue) {
        var client = this._control._client;

        client.setAttributes(this._metaInfo[CONSTANTS.GME_ID], nodePropertyNames.Attributes.name, newValue);
    };

    /**************** END OF - EDIT NODE TITLE ************************/


    return UMLStateMachineDecoratorDiagramDesignerWidget;
});