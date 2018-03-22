/**
 * @fileoverview Python Lists blocks for Blockly.
 * @author ehomeshasha@msn.com(张知严)
 */
'use strict';

goog.provide('Blockly.Blocks.python_lists');

goog.require('Blockly.Blocks');

goog.require('Blockly.Colours');

goog.require('Blockly.constants');
Blockly.Blocks['lists_create_empty'] = {
  /**
   * Block for 创建空列表.
   * @this Blockly.Block
   */
  init: function() {
    this.jsonInit({
      "type": "lists_create_empty",
      "message0": "%{BKY_LISTS_CREATE_EMPTY_TITLE}",
      "output": "Array",
      "colour": "%{BKY_LISTS_HUE}",
      "tooltip": "%{BKY_LISTS_CREATE_EMPTY_TOOLTIP}",
      "helpUrl": "%{BKY_LISTS_CREATE_EMPTY_HELPURL}"
    });
  }
};
