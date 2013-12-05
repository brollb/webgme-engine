/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['js/Constants',
    'js/Utils/METAAspectHelper',
    'js/NodePropertyNames',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants',
    'text!./Diagram.html',
    'text!./InitialState.html',
    'text!./EndState.html',
    'text!./State.html',
    'text!./Transition.html',
    './Transition'], function (CONSTANTS,
                                       METAAspectHelper,
                                       nodePropertyNames,
                                       DiagramDesignerWidgetConstants,
                                       DiagramTemplate,
                                       InitialStateTemplate,
                                       EndStateTemplate,
                                       StateTemplate,
                                       TransitionTemplate,
                                       Transition) {

    var UMLStateMachineDecoratorCore,
        UMLStateMachineDecoratorClass = 'uml-state-machine',
        DEFAULT_CLASS = 'default',
        METATYPETEMPLATE_INTIAL = $(InitialStateTemplate),
        METATYPETEMPLATE_END = $(EndStateTemplate),
        METATYPETEMPLATE_UMLSTATEDIAGRAM = $(DiagramTemplate),
        METATYPETEMPLATE_STATE = $(StateTemplate),
        METATYPETEMPLATE_TRANSITION = $(TransitionTemplate);


    UMLStateMachineDecoratorCore = function () {
    };

    UMLStateMachineDecoratorCore.prototype.$DOMBase = $('<div/>', {'class': UMLStateMachineDecoratorClass});


    UMLStateMachineDecoratorCore.prototype._initializeDecorator = function (params) {
        this.$name = undefined;

        this._displayConnectors = false;
        if (params && params.connectors) {
            this._displayConnectors = params.connectors;
        }
    };

    /**** Override from *.WidgetDecoratorBase ****/
    UMLStateMachineDecoratorCore.prototype.getTerritoryQuery = function () {
        return {};
    };


    /**** Override from *.WidgetDecoratorBase ****/
    UMLStateMachineDecoratorCore.prototype.destroy = function () {
    };


    /**** Override from *.WidgetDecoratorBase ****/
    UMLStateMachineDecoratorCore.prototype.doSearch = function (searchDesc) {
        var searchText = searchDesc.toString().toLowerCase(),
            name = this._getName();

        return (name && name.toLowerCase().indexOf(searchText) !== -1);
    };


    UMLStateMachineDecoratorCore.prototype.renderMetaType = function () {
        if (this._metaType && this._metaTypeTemplate) {
            this.$el.append(this._metaTypeTemplate);
        } else {
            this.$el.addClass(DEFAULT_CLASS);
            this.$el.append($('<div/>', {'class': 'name'}));
        }

        this.$name = this.$el.find('.name');

        if (this._displayConnectors) {
            this.initializeConnectors();
        } else {
            this.$el.find('.' + DiagramDesignerWidgetConstants.CONNECTOR_CLASS).remove();
        }

        this._renderMetaTypeSpecificParts();
    };

    /* TO BE OVERRIDDEN IN META TYPE SPECIFIC CODE */
    UMLStateMachineDecoratorCore.prototype._renderMetaTypeSpecificParts = function () {
    };

    UMLStateMachineDecoratorCore.prototype._getName = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._gmeID),
            name = "(N/A)";

        if (nodeObj) {
            name = nodeObj.getAttribute(nodePropertyNames.Attributes.name) || name;
        }

        return name;
    };


    UMLStateMachineDecoratorCore.prototype._renderContent = function () {
        //render GME-ID in the DOM, for debugging
        this._gmeID = this._metaInfo[CONSTANTS.GME_ID];
        this.$el.attr({"data-id": this._gmeID});

        this._instantiateMetaType();

        this.renderMetaType();

        //find placeholders

        this._update();
    };


    /**** Override from PartBrowserWidgetDecoratorBase ****/
    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    UMLStateMachineDecoratorCore.prototype.update = function () {
        this._update();

    };

    UMLStateMachineDecoratorCore.prototype._update = function () {
        this._updateName();
        this._updateMetaTypeSpecificParts();
    };

    /* TO BE OVERRIDDEN IN META TYPE SPECIFIC CODE */
    UMLStateMachineDecoratorCore.prototype._updateMetaTypeSpecificParts = function () {
    };

    /***** UPDATE THE NAME OF THE NODE *****/
    UMLStateMachineDecoratorCore.prototype._updateName = function () {
        if (this.$name) {
            this.$name.text(this._getName());
        }
    };


    UMLStateMachineDecoratorCore.prototype._instantiateMetaType = function () {
        var WebGMEGlobal_META = WebGMEGlobal[METAAspectHelper.METAKey];

        if (WebGMEGlobal_META) {
            if (METAAspectHelper.isMETAType(this._gmeID, WebGMEGlobal_META.Initial)) {
                this._metaType = WebGMEGlobal_META.Initial;
                this._metaTypeTemplate = METATYPETEMPLATE_INTIAL.clone();
            } else if (METAAspectHelper.isMETAType(this._gmeID, WebGMEGlobal_META.End)) {
                this._metaType = WebGMEGlobal_META.End;
                this._metaTypeTemplate = METATYPETEMPLATE_END.clone();
            } else if (METAAspectHelper.isMETAType(this._gmeID, WebGMEGlobal_META.State)) {
                this._metaType = WebGMEGlobal_META.State;
                this._metaTypeTemplate = METATYPETEMPLATE_STATE.clone();
            } else if (METAAspectHelper.isMETAType(this._gmeID, WebGMEGlobal_META.Transition)) {
                this._metaType = WebGMEGlobal_META.Transition;
                this._metaTypeTemplate = METATYPETEMPLATE_TRANSITION.clone();
                _.extend(this, new Transition());
            } else if (METAAspectHelper.isMETAType(this._gmeID, WebGMEGlobal_META.UMLStateDiagram)) {
                this._metaType = WebGMEGlobal_META.UMLStateDiagram;
                this._metaTypeTemplate = METATYPETEMPLATE_UMLSTATEDIAGRAM.clone();
            }
        }
    };


    return UMLStateMachineDecoratorCore;
});