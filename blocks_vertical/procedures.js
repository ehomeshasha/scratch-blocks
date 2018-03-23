/**
 * @license
 * Visual Blocks Editor
 *
 * Copyright 2012 Google Inc.
 * https://developers.google.com/blockly/
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Procedure blocks for Scratch.
 */
'use strict';

goog.provide('Blockly.Blocks.procedures');

goog.require('Blockly.Blocks');
goog.require('Blockly.constants');


// TODO: Create a namespace properly.
Blockly.ScratchBlocks.ProcedureUtils = {};

// Serialization and deserialization.

/**
 * Create XML to represent the (non-editable) name and arguments of a procedure
 * call block.
 * @return {!Element} XML storage element.
 * @this Blockly.Block
 */
Blockly.ScratchBlocks.ProcedureUtils.callerMutationToDom = function() {
  var container = document.createElement('mutation');
  container.setAttribute('proccode', this.procCode_);
  container.setAttribute('argumentids', JSON.stringify(this.argumentIds_));
  container.setAttribute('warp', JSON.stringify(this.warp_));
  return container;
};

/**
 * Parse XML to restore the (non-editable) name and arguments of a procedure
 * call block.
 * @param {!Element} xmlElement XML storage element.
 * @this Blockly.Block
 */
Blockly.ScratchBlocks.ProcedureUtils.callerDomToMutation = function(xmlElement) {
  this.procCode_ = xmlElement.getAttribute('proccode');
  this.argumentIds_ = JSON.parse(xmlElement.getAttribute('argumentids'));
  this.warp_ = JSON.parse(xmlElement.getAttribute('warp'));
  this.updateDisplay_();
};

/**
 * Create XML to represent the (non-editable) name and arguments of a
 * procedures_prototype block or a procedures_declaration block.
 * @return {!Element} XML storage element.
 * @this Blockly.Block
 */
Blockly.ScratchBlocks.ProcedureUtils.definitionMutationToDom = function() {
  var container = document.createElement('mutation');
  container.setAttribute('proccode', this.procCode_);
  container.setAttribute('argumentids', JSON.stringify(this.argumentIds_));
  container.setAttribute('argumentnames', JSON.stringify(this.displayNames_));
  container.setAttribute('argumentdefaults',
      JSON.stringify(this.argumentDefaults_));
  container.setAttribute('warp', JSON.stringify(this.warp_));
  return container;
};

/**
 * Parse XML to restore the (non-editable) name and arguments of a
 * procedures_prototype block or a procedures_declaration block.
 * @param {!Element} xmlElement XML storage element.
 * @this Blockly.Block
 */
Blockly.ScratchBlocks.ProcedureUtils.definitionDomToMutation = function(xmlElement) {
  this.procCode_ = xmlElement.getAttribute('proccode');
  this.warp_ = JSON.parse(xmlElement.getAttribute('warp'));

  this.argumentIds_ = JSON.parse(xmlElement.getAttribute('argumentids'));
  this.displayNames_ = JSON.parse(xmlElement.getAttribute('argumentnames'));
  this.argumentDefaults_ = JSON.parse(
      xmlElement.getAttribute('argumentdefaults'));
  this.updateDisplay_();
};

// End of serialization and deserialization.

// Shared by all three procedure blocks (procedures_declaration,
// procedures_call, and procedures_prototype).
/**
 * Returns the name of the procedure this block calls, or the empty string if
 * it has not yet been set.
 * @return {string} Procedure name.
 * @this Blockly.Block
 */
Blockly.ScratchBlocks.ProcedureUtils.getProcCode = function() {
  return this.procCode_;
};

/**
 * Update the block's structure and appearance to match the internally stored
 * mutation.
 * @private
 * @this Blockly.Block
 */
Blockly.ScratchBlocks.ProcedureUtils.updateDisplay_ = function() {
  var wasRendered = this.rendered;
  this.rendered = false;

  var connectionMap = this.disconnectOldBlocks_();
  this.removeAllInputs_();

  this.createAllInputs_(connectionMap);
  this.deleteShadows_(connectionMap);

  this.rendered = wasRendered;
  if (wasRendered && !this.isInsertionMarker()) {
    this.initSvg();
    this.render();
  }
};

/**
 * Disconnect old blocks from all value inputs on this block, but hold onto them
 * in case they can be reattached later.
 * @return {!Object.<string, Blockly.Block>} An object mapping argument IDs to
 *     the blocks that were connected to those IDs at the beginning of the
 *     mutation.
 * @private
 * @this Blockly.Block
 */
Blockly.ScratchBlocks.ProcedureUtils.disconnectOldBlocks_ = function() {
  // Remove old stuff
  var connectionMap = {};
  for (var i = 0, input; input = this.inputList[i]; i++) {
    if (input.connection) {
      // Remove the shadow DOM.  Otherwise a shadow block will respawn
      // instantly, and we'd have to remove it when we remove the input.
      input.connection.setShadowDom(null);
      var target = input.connection.targetBlock();
      connectionMap[input.name] = target;
      if (target) {
        input.connection.disconnect();
      }
    }
  }
  return connectionMap;
};

/**
 * Remove all inputs on the block, including dummy inputs.
 * Assumes no input has shadow DOM set.
 * @private
 * @this Blockly.Block
 */
Blockly.ScratchBlocks.ProcedureUtils.removeAllInputs_ = function() {
  // Delete inputs directly instead of with block.removeInput to avoid splicing
  // out of the input list at every index.
  for (var i = 0, input; input = this.inputList[i]; i++) {
    input.dispose();
  }
  this.inputList = [];
};

/**
 * Create all inputs specified by the new procCode, and populate them with
 * shadow blocks or reconnected old blocks as appropriate.
 * @param {!Object.<string, Blockly.Block>} connectionMap An object mapping
 *     argument IDs to the blocks that were connected to those IDs at the
 *     beginning of the mutation.
 * @private
 * @this Blockly.Block
 */
Blockly.ScratchBlocks.ProcedureUtils.createAllInputs_ = function(connectionMap) {
  // Split the proc into components, by %n, %b, and %s (ignoring escaped).
  var procComponents = this.procCode_.split(/(?=[^\\]\%[nbs])/);
  procComponents = procComponents.map(function(c) {
    return c.trim(); // Strip whitespace.
  });
  // Create arguments and labels as appropriate.
  var argumentCount = 0;
  for (var i = 0, component; component = procComponents[i]; i++) {
    var labelText;
    if (component.substring(0, 1) == '%') {
      var argumentType = component.substring(1, 2);
      if (!(argumentType == 'n' || argumentType == 'b' || argumentType == 's')) {
        throw new Error(
            'Found an custom procedure with an invalid type: ' + argumentType);
      }
      labelText = component.substring(2).trim();

      var id = this.argumentIds_[argumentCount];
      var oldBlock = null;
      if (connectionMap && (id in connectionMap)) {
        oldBlock = connectionMap[id];
      }

      var input = this.appendValueInput(id);
      if (argumentType == 'b') {
        input.setCheck('Boolean');
      }
      this.populateArgument_(argumentType, argumentCount, connectionMap, oldBlock,
          input);
      argumentCount++;
    } else {
      labelText = component.trim();
    }
    this.addProcedureLabel_(labelText.replace(/\\%/, '%'));
  }
};

/**
 * Delete all shadow blocks in the given map.
 * @param {!Object.<string, Blockly.Block>} connectionMap An object mapping
 *     argument IDs to the blocks that were connected to those IDs at the
 *     beginning of the mutation.
 * @private
 * @this Blockly.Block
 */
Blockly.ScratchBlocks.ProcedureUtils.deleteShadows_ = function(connectionMap) {
  // Get rid of all of the old shadow blocks if they aren't connected.
  if (connectionMap) {
    for (var id in connectionMap) {
      var block = connectionMap[id];
      if (block && block.isShadow()) {
        block.dispose();
        connectionMap[id] = null;
      }
    }
  }
};
// End of shared code.

/**
 * Add a label field with the given text to a procedures_call or
 * procedures_prototype block.
 * @param {string} text The label text.
 * @private
 */
Blockly.ScratchBlocks.ProcedureUtils.addLabelField_ = function(text) {
  this.appendDummyInput().appendField(text);
};

/**
 * Add a label editor with the given text to a procedures_declaration
 * block.  Editing the text in the label editor updates the text of the
 * corresponding label fields on function calls.
 * @param {string} text The label text.
 * @private
 */
Blockly.ScratchBlocks.ProcedureUtils.addLabelEditor_ = function(text) {
  if (text) {
    this.appendDummyInput(Blockly.utils.genUid()).
        appendField(new Blockly.FieldTextInputRemovable(text));
  }
};

/**
 * Build a DOM node representing a shadow block of the given type.
 * @param {string} type One of 's' (string) or 'n' (number).
 * @return {!Element} The DOM node representing the new shadow block.
 * @private
 * @this Blockly.Block
 */
Blockly.ScratchBlocks.ProcedureUtils.buildShadowDom_ = function(type) {
  var shadowDom = goog.dom.createDom('shadow');
  if (type == 'n') {
    var shadowType = 'math_number';
    var fieldName = 'NUM';
    var fieldValue = '1';
  } else {
    var shadowType = 'text';
    var fieldName = 'TEXT';
    var fieldValue = '';
  }
  shadowDom.setAttribute('type', shadowType);
  var fieldDom = goog.dom.createDom('field', null, fieldValue);
  fieldDom.setAttribute('name', fieldName);
  shadowDom.appendChild(fieldDom);
  return shadowDom;
};

/**
 * Create a new shadow block and attach it to the given input.
 * @param {!Blockly.Input} input The value input to attach a block to.
 * @param {string} argumentType One of 'b' (boolean), 's' (string) or
 *     'n' (number).
 * @private
 * @this Blockly.Block
 */
Blockly.ScratchBlocks.ProcedureUtils.attachShadow_ = function(input,
    argumentType) {
  if (argumentType == 'n' || argumentType == 's') {
    var blockType = argumentType == 'n' ? 'math_number' : 'text';
    Blockly.Events.disable();
    try {
      var newBlock = this.workspace.newBlock(blockType);
      if (argumentType == 'n') {
        newBlock.setFieldValue('1', 'NUM');
      } else {
        newBlock.setFieldValue('', 'TEXT');
      }
      newBlock.setShadow(true);
      if (!this.isInsertionMarker()) {
        newBlock.initSvg();
        newBlock.render(false);
      }
    } finally {
      Blockly.Events.enable();
    }
    if (Blockly.Events.isEnabled()) {
      Blockly.Events.fire(new Blockly.Events.BlockCreate(newBlock));
    }
    newBlock.outputConnection.connect(input.connection);
  }
};

/**
 * Create a new argument reporter block.
 * @param {string} argumentType One of 'b' (boolean), 's' (string) or
 *     'n' (number).
 * @param {string} displayName The name of the argument as provided by the
 *     user, which becomes the text of the label on the argument reporter block.
 * @return {!Blockly.BlockSvg} The newly created argument reporter block.
 * @private
 * @this Blockly.Block
 */
Blockly.ScratchBlocks.ProcedureUtils.createArgumentReporter_ = function(
    argumentType, displayName) {
  if (argumentType == 'n' || argumentType == 's') {
    var blockType = 'argument_reporter_string_number';
  } else {
    var blockType = 'argument_reporter_boolean';
  }
  Blockly.Events.disable();
  try {
    var newBlock = this.workspace.newBlock(blockType);
    newBlock.setShadow(true);
    newBlock.setFieldValue(displayName, 'VALUE');
    if (!this.isInsertionMarker()) {
      newBlock.initSvg();
      newBlock.render(false);
    }
  } finally {
    Blockly.Events.enable();
  }
  if (Blockly.Events.isEnabled()) {
    Blockly.Events.fire(new Blockly.Events.BlockCreate(newBlock));
  }
  return newBlock;
};

/**
 * Populate the argument by attaching the correct child block or shadow to the
 * given input.
 * @param {string} type One of 'b' (boolean), 's' (string) or 'n' (number).
 * @param {number} index The index of this argument into the argument id array.
 * @param {!Object.<string, Blockly.Block>} connectionMap An object mapping
 *     argument IDs to the blocks that were connected to those IDs at the
 *     beginning of the mutation.
 * @param {Blockly.BlockSvg} oldBlock The block that was previously connected to
 *     this input, or null.
 * @param {!Blockly.Input} input The newly created input to populate.
 * @private
 * @this Blockly.Block
 */
Blockly.ScratchBlocks.ProcedureUtils.populateArgumentOnCaller_ = function(type,
    index, connectionMap, oldBlock, input) {
  if (connectionMap && oldBlock) {
    // Reattach the old block.
    connectionMap[input.name] = null;
    oldBlock.outputConnection.connect(input.connection);
    if (type != 'b') {
      // TODO: Preserve old shadow DOM.
      input.connection.setShadowDom(this.buildShadowDom_(type));
    }
  } else {
    this.attachShadow_(input, type);
  }
};

/**
 * Populate the argument by attaching the correct argument reporter to the given
 * input.
 * @param {string} type One of 'b' (boolean), 's' (string) or 'n' (number).
 * @param {number} index The index of this argument into the argument ID and
 *     argument display name arrays.
 * @param {!Object.<string, Blockly.Block>} connectionMap An object mapping
 *     argument IDs to the blocks that were connected to those IDs at the
 *     beginning of the mutation.
 * @param {Blockly.BlockSvg} oldBlock The argument reporter that was previously
 *     connected to this input, or null.
 * @param {!Blockly.Input} input The newly created input to populate.
 * @private
 * @this Blockly.Block
 */
Blockly.ScratchBlocks.ProcedureUtils.populateArgumentOnPrototype_ = function(
    type, index, connectionMap, oldBlock, input) {
  var oldTypeMatches =
    Blockly.ScratchBlocks.ProcedureUtils.checkOldTypeMatches_(oldBlock, type);
  var displayName = this.displayNames_[index];

  // Decide which block to attach.
  if (connectionMap && oldBlock && oldTypeMatches) {
    // Update the text if needed. The old argument reporter is the same type,
    // and on the same input, but the argument's display name may have changed.
    var argumentReporter = oldBlock;
    argumentReporter.setFieldValue(displayName, 'VALUE');
    connectionMap[input.name] = null;
  } else {
    var argumentReporter = this.createArgumentReporter_(type, displayName);
  }

  // Attach the block.
  input.connection.connect(argumentReporter.outputConnection);
};

/**
 * Populate the argument by attaching the correct argument editor to the given
 * input.
 * @param {string} type One of 'b' (boolean), 's' (string) or 'n' (number).
 * @param {number} index The index of this argument into the argument id and
 *     argument display name arrays.
 * @param {!Object.<string, Blockly.Block>} connectionMap An object mapping
 *     argument IDs to the blocks that were connected to those IDs at the
 *     beginning of the mutation.
 * @param {Blockly.BlockSvg} oldBlock The block that was previously connected to
 *     this input, or null.
 * @param {!Blockly.Input} input The newly created input to populate.
 * @private
 * @this Blockly.Block
 */
Blockly.ScratchBlocks.ProcedureUtils.populateArgumentOnDeclaration_ = function(
    type, index, connectionMap, oldBlock, input) {
  // TODO: This always returns false, because it checks for argument reporter
  // blocks instead of argument editor blocks.  Create a new version for argument
  // editors.
  var oldTypeMatches =
    Blockly.ScratchBlocks.ProcedureUtils.checkOldTypeMatches_(oldBlock, type);
  var displayName = this.displayNames_[index];

  // Decide which block to attach.
  if (connectionMap && oldBlock && oldTypeMatches) {
    var argumentEditor = oldBlock;
    oldBlock.setFieldValue(displayName, 'TEXT');
    connectionMap[input.name] = null;
  } else {
    var argumentEditor = this.createArgumentEditor_(type, displayName);
  }

  // Attach the block.
  input.connection.connect(argumentEditor.outputConnection);
};

/**
 * Check whether the type of the old block corresponds to the given argument
 * type.
 * @param {Blockly.BlockSvg} oldBlock The old block to check.
 * @param {string} type The argument type.  One of 'n', 'n', or 's'.
 * @return {boolean} True if the type matches, false otherwise.
 */
Blockly.ScratchBlocks.ProcedureUtils.checkOldTypeMatches_ = function(oldBlock,
    type) {
  if (!oldBlock) {
    return false;
  }
  if ((type == 'n' || type == 's') &&
      oldBlock.type == 'argument_reporter_string_number') {
    return true;
  }
  if (type == 'b' && oldBlock.type == 'argument_reporter_boolean') {
    return true;
  }
  return false;
};

/**
 * Create an argument editor.
 * An argument editor is a shadow block with a single text field, which is used
 * to set the display name of the argument.
 * @param {string} argumentType One of 'b' (boolean), 's' (string) or
 *     'n' (number).
 * @param {string} displayName The display name  of this argument, which is the
 *     text of the field on the shadow block.
 * @return {!Blockly.BlockSvg} The newly created argument editor block.
 * @private
 * @this Blockly.Block
 */
Blockly.ScratchBlocks.ProcedureUtils.createArgumentEditor_ = function(
    argumentType, displayName) {
  Blockly.Events.disable();
  try {
    if (argumentType == 'n' || argumentType == 's') {
      var newBlock = this.workspace.newBlock('argument_editor_string_number');
    } else {
      var newBlock = this.workspace.newBlock('argument_editor_boolean');
    }
    newBlock.setFieldValue(displayName, 'TEXT');
    newBlock.setShadow(true);
    if (!this.isInsertionMarker()) {
      newBlock.initSvg();
      newBlock.render(false);
    }
  } finally {
    Blockly.Events.enable();
  }
  if (Blockly.Events.isEnabled()) {
    Blockly.Events.fire(new Blockly.Events.BlockCreate(newBlock));
  }
  return newBlock;
};

/**
 * Update the serializable information on the block based on the existing inputs
 * and their text.
 */
Blockly.ScratchBlocks.ProcedureUtils.updateDeclarationProcCode_ = function() {
  this.procCode_ = '';
  this.displayNames_ = [];
  this.argumentIds_ = [];
  for (var i = 0; i < this.inputList.length; i++) {
    if (i != 0) {
      this.procCode_ += ' ';
    }
    var input = this.inputList[i];
    if (input.type == Blockly.DUMMY_INPUT) {
      this.procCode_ += input.fieldRow[0].getValue();
    } else if (input.type == Blockly.INPUT_VALUE) {
      // Inspect the argument editor.
      var target = input.connection.targetBlock();
      this.displayNames_.push(target.getFieldValue('TEXT'));
      this.argumentIds_.push(input.name);
      if (target.type == 'argument_editor_boolean') {
        this.procCode_ += '%b';
      } else {
        this.procCode_ += '%s';
      }
    } else {
      throw new Error(
          'Unexpected input type on a procedure mutator root: ' + input.type);
    }
  }
};

/**
 * Focus on the last argument editor or label editor on the block.
 * @private
 */
Blockly.ScratchBlocks.ProcedureUtils.focusLastEditor_ = function() {
  if (this.inputList.length > 0) {
    var newInput = this.inputList[this.inputList.length - 1];
    if (newInput.type == Blockly.DUMMY_INPUT) {
      newInput.fieldRow[0].showEditor_();
    } else if (newInput.type == Blockly.INPUT_VALUE) {
      // Inspect the argument editor.
      var target = newInput.connection.targetBlock();
      target.getField('TEXT').showEditor_();
    }
  }
};

/**
 * Externally-visible function to add a label to the procedure declaration.
 * @public
 */
Blockly.ScratchBlocks.ProcedureUtils.addLabelExternal = function() {
  Blockly.WidgetDiv.hide(true);
  this.procCode_ = this.procCode_ + ' label text';
  this.updateDisplay_();
  this.focusLastEditor_();
};

/**
 * Externally-visible function to add a boolean argument to the procedure
 * declaration.
 * @public
 */
Blockly.ScratchBlocks.ProcedureUtils.addBooleanExternal = function() {
  Blockly.WidgetDiv.hide(true);
  this.procCode_ = this.procCode_ + ' %b';
  this.displayNames_.push('boolean');
  this.argumentIds_.push(Blockly.utils.genUid());
  this.argumentDefaults_.push('todo');
  this.updateDisplay_();
  this.focusLastEditor_();
};

/**
 * Externally-visible function to add a string/number argument to the procedure
 * declaration.
 * @public
 */
Blockly.ScratchBlocks.ProcedureUtils.addStringNumberExternal = function() {
  Blockly.WidgetDiv.hide(true);
  this.procCode_ = this.procCode_ + ' %s';
  this.displayNames_.push('number or text');
  this.argumentIds_.push(Blockly.utils.genUid());
  this.argumentDefaults_.push('todo');
  this.updateDisplay_();
  this.focusLastEditor_();
};

/**
 * Externally-visible function to get the warp on procedure declaration.
 * @return {boolean} The value of the warp_ property.
 * @public
 */
Blockly.ScratchBlocks.ProcedureUtils.getWarp = function() {
  return this.warp_;
};

/**
 * Externally-visible function to set the warp on procedure declaration.
 * @param {boolean} warp The value of the warp_ property.
 * @public
 */
Blockly.ScratchBlocks.ProcedureUtils.setWarp = function(warp) {
  this.warp_ = warp;
};

/**
 * Callback to remove a field, only for the declaration block.
 * @param {Blockly.Field} field The field being removed.
 * @public
 */
Blockly.ScratchBlocks.ProcedureUtils.removeFieldCallback = function(field) {
  // Do not delete if there is only one input
  if (this.inputList.length === 1) {
    return;
  }
  var inputNameToRemove = null;
  for (var n = 0; n < this.inputList.length; n++) {
    var input = this.inputList[n];
    if (input.connection) {
      var target = input.connection.targetBlock();
      if (target.getField(field.name) == field) {
        inputNameToRemove = input.name;
      }
    } else {
      for (var j = 0; j < input.fieldRow.length; j++) {
        if (input.fieldRow[j] == field) {
          inputNameToRemove = input.name;
        }
      }
    }
  }
  if (inputNameToRemove) {
    Blockly.WidgetDiv.hide(true);
    this.removeInput(inputNameToRemove);
    this.onChangeFn();
    this.updateDisplay_();
  }
};

/**
 * Callback to pass removeField up to the declaration block from arguments.
 * @param {Blockly.Field} field The field being removed.
 * @public
 */
Blockly.ScratchBlocks.ProcedureUtils.removeArgumentCallback_ = function(
    field) {
  if (this.parentBlock_ && this.parentBlock_.removeFieldCallback) {
    this.parentBlock_.removeFieldCallback(field);
  }
};

Blockly.Blocks['procedures_definition'] = {
  /**
   * Block for defining a procedure with no return value.
   * @this Blockly.Block
   */
  init: function() {
    this.jsonInit({
      "message0": "define %1",
      "args0": [
        {
          "type": "input_statement",
          "name": "custom_block"
        }
      ],
      "extensions": ["colours_more", "shape_hat", "procedure_def_contextmenu"]
    });
  }
};

Blockly.Blocks['procedures_call'] = {
  /**
   * Block for calling a procedure with no return value.
   * @this Blockly.Block
   */
  init: function() {
    this.jsonInit({
      "extensions": ["colours_more", "shape_statement", "procedure_call_contextmenu"]
    });
    this.procCode_ = '';
    this.argumentIds_ = [];
    this.warp_ = false;
  },
  // Shared.
  getProcCode: Blockly.ScratchBlocks.ProcedureUtils.getProcCode,
  removeAllInputs_: Blockly.ScratchBlocks.ProcedureUtils.removeAllInputs_,
  disconnectOldBlocks_: Blockly.ScratchBlocks.ProcedureUtils.disconnectOldBlocks_,
  deleteShadows_: Blockly.ScratchBlocks.ProcedureUtils.deleteShadows_,
  createAllInputs_: Blockly.ScratchBlocks.ProcedureUtils.createAllInputs_,
  updateDisplay_: Blockly.ScratchBlocks.ProcedureUtils.updateDisplay_,

  // Exist on all three blocks, but have different implementations.
  mutationToDom: Blockly.ScratchBlocks.ProcedureUtils.callerMutationToDom,
  domToMutation: Blockly.ScratchBlocks.ProcedureUtils.callerDomToMutation,
  populateArgument_: Blockly.ScratchBlocks.ProcedureUtils.populateArgumentOnCaller_,
  addProcedureLabel_: Blockly.ScratchBlocks.ProcedureUtils.addLabelField_,

  // Only exists on the external caller.
  attachShadow_: Blockly.ScratchBlocks.ProcedureUtils.attachShadow_,
  buildShadowDom_: Blockly.ScratchBlocks.ProcedureUtils.buildShadowDom_
};

Blockly.Blocks['procedures_prototype'] = {
  /**
   * Block for calling a procedure with no return value, for rendering inside
   * define block.
   * @this Blockly.Block
   */
  init: function() {
    this.jsonInit({
      "extensions": ["colours_more", "shape_statement"]
    });

    /* Data known about the procedure. */
    this.procCode_ = '';
    this.displayNames_ = [];
    this.argumentIds_ = [];
    this.argumentDefaults_ = [];
    this.warp_ = false;
  },
  // Shared.
  getProcCode: Blockly.ScratchBlocks.ProcedureUtils.getProcCode,
  removeAllInputs_: Blockly.ScratchBlocks.ProcedureUtils.removeAllInputs_,
  disconnectOldBlocks_: Blockly.ScratchBlocks.ProcedureUtils.disconnectOldBlocks_,
  deleteShadows_: Blockly.ScratchBlocks.ProcedureUtils.deleteShadows_,
  createAllInputs_: Blockly.ScratchBlocks.ProcedureUtils.createAllInputs_,
  updateDisplay_: Blockly.ScratchBlocks.ProcedureUtils.updateDisplay_,

  // Exist on all three blocks, but have different implementations.
  mutationToDom: Blockly.ScratchBlocks.ProcedureUtils.definitionMutationToDom,
  domToMutation: Blockly.ScratchBlocks.ProcedureUtils.definitionDomToMutation,
  populateArgument_: Blockly.ScratchBlocks.ProcedureUtils.populateArgumentOnPrototype_,
  addProcedureLabel_: Blockly.ScratchBlocks.ProcedureUtils.addLabelField_,

  // Only exists on procedures_prototype.
  createArgumentReporter_: Blockly.ScratchBlocks.ProcedureUtils.createArgumentReporter_
};

Blockly.Blocks['procedures_declaration'] = {
  /**
   * The root block in the procedure declaration editor.
   * @this Blockly.Block
   */
  init: function() {
    this.jsonInit({
      "extensions": ["colours_more", "shape_statement"]
    });
    /* Data known about the procedure. */
    this.procCode_ = '';
    this.displayNames_ = [];
    this.argumentIds_ = [];
    this.argumentDefaults_ = [];
    this.warp_ = false;
  },
  // Shared.
  getProcCode: Blockly.ScratchBlocks.ProcedureUtils.getProcCode,
  removeAllInputs_: Blockly.ScratchBlocks.ProcedureUtils.removeAllInputs_,
  disconnectOldBlocks_: Blockly.ScratchBlocks.ProcedureUtils.disconnectOldBlocks_,
  deleteShadows_: Blockly.ScratchBlocks.ProcedureUtils.deleteShadows_,
  createAllInputs_: Blockly.ScratchBlocks.ProcedureUtils.createAllInputs_,
  updateDisplay_: Blockly.ScratchBlocks.ProcedureUtils.updateDisplay_,

  // Exist on all three blocks, but have different implementations.
  mutationToDom: Blockly.ScratchBlocks.ProcedureUtils.definitionMutationToDom,
  domToMutation: Blockly.ScratchBlocks.ProcedureUtils.definitionDomToMutation,
  populateArgument_: Blockly.ScratchBlocks.ProcedureUtils.populateArgumentOnDeclaration_,
  addProcedureLabel_: Blockly.ScratchBlocks.ProcedureUtils.addLabelEditor_,

  // Exist on declaration and arguments editors, with different implementations.
  removeFieldCallback: Blockly.ScratchBlocks.ProcedureUtils.removeFieldCallback,

  // Only exist on procedures_declaration.
  createArgumentEditor_: Blockly.ScratchBlocks.ProcedureUtils.createArgumentEditor_,
  focusLastEditor_: Blockly.ScratchBlocks.ProcedureUtils.focusLastEditor_,
  getWarp: Blockly.ScratchBlocks.ProcedureUtils.getWarp,
  setWarp: Blockly.ScratchBlocks.ProcedureUtils.setWarp,
  addLabelExternal: Blockly.ScratchBlocks.ProcedureUtils.addLabelExternal,
  addBooleanExternal: Blockly.ScratchBlocks.ProcedureUtils.addBooleanExternal,
  addStringNumberExternal: Blockly.ScratchBlocks.ProcedureUtils.addStringNumberExternal,
  onChangeFn: Blockly.ScratchBlocks.ProcedureUtils.updateDeclarationProcCode_
};

Blockly.Blocks['argument_reporter_boolean'] = {
  init: function() {
    this.jsonInit({ "message0": " %1",
      "args0": [
        {
          "type": "field_label_serializable",
          "name": "VALUE",
          "text": ""
        }
      ],
      "extensions": ["colours_more", "output_boolean"]
    });
  }
};

Blockly.Blocks['argument_reporter_string_number'] = {
  init: function() {
    this.jsonInit({ "message0": " %1",
      "args0": [
        {
          "type": "field_label_serializable",
          "name": "VALUE",
          "text": ""
        }
      ],
      "extensions": ["colours_more", "output_number", "output_string"]
    });
  }
};

Blockly.Blocks['argument_editor_boolean'] = {
  init: function() {
    this.jsonInit({ "message0": " %1",
      "args0": [
        {
          "type": "field_input_removable",
          "name": "TEXT",
          "text": "foo"
        }
      ],
      "colour": Blockly.Colours.textField,
      "colourSecondary": Blockly.Colours.textField,
      "colourTertiary": Blockly.Colours.textField,
      "extensions": ["output_boolean"]
    });
  },
  // Exist on declaration and arguments editors, with different implementations.
  removeFieldCallback: Blockly.ScratchBlocks.ProcedureUtils.removeArgumentCallback_
};

Blockly.Blocks['argument_editor_string_number'] = {
  init: function() {
    this.jsonInit({ "message0": " %1",
      "args0": [
        {
          "type": "field_input_removable",
          "name": "TEXT",
          "text": "foo"
        }
      ],
      "colour": Blockly.Colours.textField,
      "colourSecondary": Blockly.Colours.textField,
      "colourTertiary": Blockly.Colours.textField,
      "extensions": ["output_number", "output_string"]
    });
  },
  // Exist on declaration and arguments editors, with different implementations.
  removeFieldCallback: Blockly.ScratchBlocks.ProcedureUtils.removeArgumentCallback_
};


//From Blockpy
Blockly.Blocks['procedures_defnoreturn'] = {
  /**
   * Block for defining a procedure with no return value.
   * @this Blockly.Block
   */
  init: function() {
    var nameField = new Blockly.FieldTextInput(
      Blockly.Msg.PROCEDURES_DEFNORETURN_PROCEDURE,
      Blockly.Procedures.rename);
    nameField.setSpellcheck(false);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.appendDummyInput()
      .appendField(Blockly.Msg.PROCEDURES_DEFNORETURN_TITLE)
      .appendField(nameField, 'NAME')
      .appendField('', 'PARAMS');
    this.setMutator(new Blockly.Mutator(['procedures_mutatorarg']));
    /*if ((this.workspace.options.comments ||
         (this.workspace.options.parentWorkspace &&
          this.workspace.options.parentWorkspace.options.comments)) &&
        Blockly.Msg.PROCEDURES_DEFNORETURN_COMMENT) {
      this.setCommentText(Blockly.Msg.PROCEDURES_DEFNORETURN_COMMENT);
    }*/
    this.setColour(Blockly.Blocks.procedures.HUE);
    this.setTooltip(Blockly.Msg.PROCEDURES_DEFNORETURN_TOOLTIP);
    this.setHelpUrl(Blockly.Msg.PROCEDURES_DEFNORETURN_HELPURL);
    this.arguments_ = [];
    this.setStatements_(true);
    this.statementConnection_ = null;
  },
  /**
   * Add or remove the statement block from this function definition.
   * @param {boolean} hasStatements True if a statement block is needed.
   * @this Blockly.Block
   */
  setStatements_: function(hasStatements) {
    if (this.hasStatements_ === hasStatements) {
      return;
    }
    if (hasStatements) {
      this.appendStatementInput('STACK')
        .appendField(Blockly.Msg.PROCEDURES_DEFNORETURN_DO);
      if (this.getInput('RETURN')) {
        this.moveInputBefore('STACK', 'RETURN');
      }
    } else {
      this.removeInput('STACK', true);
    }
    this.hasStatements_ = hasStatements;
  },
  /**
   * Update the display of parameters for this procedure definition block.
   * Display a warning if there are duplicately named parameters.
   * @private
   * @this Blockly.Block
   */
  updateParams_: function() {
    // Check for duplicated arguments.
    var badArg = false;
    var hash = {};
    for (var i = 0; i < this.arguments_.length; i++) {
      if (hash['arg_' + this.arguments_[i].toLowerCase()]) {
        badArg = true;
        break;
      }
      hash['arg_' + this.arguments_[i].toLowerCase()] = true;
    }
    if (badArg) {
      this.setWarningText(Blockly.Msg.PROCEDURES_DEF_DUPLICATE_WARNING);
    } else {
      this.setWarningText(null);
    }
    // Merge the arguments into a human-readable list.
    var paramString = '';
    if (this.arguments_.length) {
      paramString = Blockly.Msg.PROCEDURES_BEFORE_PARAMS +
        ' ' + this.arguments_.join(', ');
    }
    // The params field is deterministic based on the mutation,
    // no need to fire a change event.
    Blockly.Events.disable();
    try {
      this.setFieldValue(paramString, 'PARAMS');
    } finally {
      Blockly.Events.enable();
    }
  },
  /**
   * Create XML to represent the argument inputs.
   * @param {=boolean} opt_paramIds If true include the IDs of the parameter
   *     quarks.  Used by Blockly.Procedures.mutateCallers for reconnection.
   * @return {!Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function(opt_paramIds) {
    var container = document.createElement('mutation');
    if (opt_paramIds) {
      container.setAttribute('name', this.getFieldValue('NAME'));
    }
    for (var i = 0; i < this.arguments_.length; i++) {
      var parameter = document.createElement('arg');
      parameter.setAttribute('name', this.arguments_[i]);
      if (opt_paramIds && this.paramIds_) {
        parameter.setAttribute('paramId', this.paramIds_[i]);
      }
      container.appendChild(parameter);
    }

    // Save whether the statement input is visible.
    if (!this.hasStatements_) {
      container.setAttribute('statements', 'false');
    }
    return container;
  },
  /**
   * Parse XML to restore the argument inputs.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function(xmlElement) {
    this.arguments_ = [];
    for (var i = 0, childNode; childNode = xmlElement.childNodes[i]; i++) {
      if (childNode.nodeName.toLowerCase() == 'arg') {
        this.arguments_.push(childNode.getAttribute('name'));
      }
    }
    this.updateParams_();
    Blockly.Procedures.mutateCallers(this);

    // Show or hide the statement input.
    this.setStatements_(xmlElement.getAttribute('statements') !== 'false');
  },
  /**
   * Populate the mutator's dialog with this block's components.
   * @param {!Blockly.Workspace} workspace Mutator's workspace.
   * @return {!Blockly.Block} Root block in mutator.
   * @this Blockly.Block
   */
  decompose: function(workspace) {
    var containerBlock = workspace.newBlock('procedures_mutatorcontainer');
    containerBlock.initSvg();

    // Check/uncheck the allow statement box.
    if (this.getInput('RETURN')) {
      containerBlock.setFieldValue(this.hasStatements_ ? 'TRUE' : 'FALSE',
        'STATEMENTS');
    } else {
      containerBlock.getInput('STATEMENT_INPUT').setVisible(false);
    }

    // Parameter list.
    var connection = containerBlock.getInput('STACK').connection;
    for (var i = 0; i < this.arguments_.length; i++) {
      var paramBlock = workspace.newBlock('procedures_mutatorarg');
      paramBlock.initSvg();
      paramBlock.setFieldValue(this.arguments_[i], 'NAME');
      // Store the old location.
      paramBlock.oldLocation = i;
      connection.connect(paramBlock.previousConnection);
      connection = paramBlock.nextConnection;
    }
    // Initialize procedure's callers with blank IDs.
    Blockly.Procedures.mutateCallers(this);
    return containerBlock;
  },
  /**
   * Reconfigure this block based on the mutator dialog's components.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  compose: function(containerBlock) {
    // Parameter list.
    this.arguments_ = [];
    this.paramIds_ = [];
    var paramBlock = containerBlock.getInputTargetBlock('STACK');
    while (paramBlock) {
      this.arguments_.push(paramBlock.getFieldValue('NAME'));
      this.paramIds_.push(paramBlock.id);
      paramBlock = paramBlock.nextConnection &&
        paramBlock.nextConnection.targetBlock();
    }
    this.updateParams_();
    Blockly.Procedures.mutateCallers(this);

    // Show/hide the statement input.
    var hasStatements = containerBlock.getFieldValue('STATEMENTS');
    if (hasStatements !== null) {
      hasStatements = hasStatements == 'TRUE';
      if (this.hasStatements_ != hasStatements) {
        if (hasStatements) {
          this.setStatements_(true);
          // Restore the stack, if one was saved.
          Blockly.Mutator.reconnect(this.statementConnection_, this, 'STACK');
          this.statementConnection_ = null;
        } else {
          // Save the stack, then disconnect it.
          var stackConnection = this.getInput('STACK').connection;
          this.statementConnection_ = stackConnection.targetConnection;
          if (this.statementConnection_) {
            var stackBlock = stackConnection.targetBlock();
            stackBlock.unplug();
            stackBlock.bumpNeighbours_();
          }
          this.setStatements_(false);
        }
      }
    }
  },
  /**
   * Return the signature of this procedure definition.
   * @return {!Array} Tuple containing three elements:
   *     - the name of the defined procedure,
   *     - a list of all its arguments,
   *     - that it DOES NOT have a return value.
   * @this Blockly.Block
   */
  getProcedureDef: function() {
    return [this.getFieldValue('NAME'), this.arguments_, false];
  },
  /**
   * Return all variables referenced by this block.
   * @return {!Array.<string>} List of variable names.
   * @this Blockly.Block
   */
  getVars: function() {
    return this.arguments_;
  },
  /**
   * Notification that a variable is renaming.
   * If the name matches one of this block's variables, rename it.
   * @param {string} oldName Previous name of variable.
   * @param {string} newName Renamed variable.
   * @this Blockly.Block
   */
  renameVar: function(oldName, newName) {
    var change = false;
    for (var i = 0; i < this.arguments_.length; i++) {
      if (Blockly.Names.equals(oldName, this.arguments_[i])) {
        this.arguments_[i] = newName;
        change = true;
      }
    }
    if (change) {
      this.updateParams_();
      // Update the mutator's variables if the mutator is open.
      if (this.mutator.isVisible()) {
        var blocks = this.mutator.workspace_.getAllBlocks();
        for (var i = 0, block; block = blocks[i]; i++) {
          if (block.type == 'procedures_mutatorarg' &&
            Blockly.Names.equals(oldName, block.getFieldValue('NAME'))) {
            block.setFieldValue(newName, 'NAME');
          }
        }
      }
    }
  },
  /**
   * Add custom menu options to this block's context menu.
   * @param {!Array} options List of menu options to add to.
   * @this Blockly.Block
   */
  customContextMenu: function(options) {
    // Add option to create caller.
    var option = {enabled: true};
    var name = this.getFieldValue('NAME');
    option.text = Blockly.Msg.PROCEDURES_CREATE_DO.replace('%1', name);
    var xmlMutation = goog.dom.createDom('mutation');
    xmlMutation.setAttribute('name', name);
    for (var i = 0; i < this.arguments_.length; i++) {
      var xmlArg = goog.dom.createDom('arg');
      xmlArg.setAttribute('name', this.arguments_[i]);
      xmlMutation.appendChild(xmlArg);
    }
    var xmlBlock = goog.dom.createDom('block', null, xmlMutation);
    xmlBlock.setAttribute('type', this.callType_);
    option.callback = Blockly.ContextMenu.callbackFactory(this, xmlBlock);
    options.push(option);

    // Add options to create getters for each parameter.
    if (!this.isCollapsed()) {
      for (var i = 0; i < this.arguments_.length; i++) {
        var option = {enabled: true};
        var name = this.arguments_[i];
        option.text = Blockly.Msg.VARIABLES_SET_CREATE_GET.replace('%1', name);
        var xmlField = goog.dom.createDom('field', null, name);
        xmlField.setAttribute('name', 'VAR');
        var xmlBlock = goog.dom.createDom('block', null, xmlField);
        xmlBlock.setAttribute('type', 'variables_get');
        option.callback = Blockly.ContextMenu.callbackFactory(this, xmlBlock);
        options.push(option);
      }
    }
  },
  callType_: 'procedures_callnoreturn',
  /**
   * Called whenever anything on the workspace changes.
   * Add warning if this flow block is not nested inside a loop.
   * @this Blockly.Block
   */
  onchange: function() {
    if (!this.workspace) {
      // Block has been deleted.
      return;
    }

    // Does it have valid returns?
    var hasReturns = false;
    var descendants = this.getDescendants();
    for (var i = 0; i < descendants.length; i++) {
      if (descendants[i].type == 'procedures_return') {
        hasReturns = true;
      }
    }

    // Iterate through every block and check the name.
    var functionName = this.getFieldValue('NAME');
    var blocks = this.workspace.getAllBlocks();
    for (var i = 0; i < blocks.length; i++) {
      if (blocks[i].type == 'procedures_callreturn' ||
        blocks[i].type == 'procedures_callnoreturn') {
        var callName = blocks[i].getFieldValue('NAME');
        // Variable name may be null if the block is only half-built.
        if (callName && Blockly.Names.equals(functionName, callName)) {
          blocks[i].setReturn(hasReturns);
        }
      }
    }
  }
};

Blockly.Blocks['procedures_defreturn'] = {
  /**
   * Block for defining a procedure with a return value.
   * @this Blockly.Block
   */
  init: function() {
    var nameField = new Blockly.FieldTextInput(
      Blockly.Msg.PROCEDURES_DEFRETURN_PROCEDURE,
      Blockly.Procedures.rename);
    nameField.setSpellcheck(false);
    this.appendDummyInput()
      .appendField(Blockly.Msg.PROCEDURES_DEFRETURN_TITLE)
      .appendField(nameField, 'NAME')
      .appendField('', 'PARAMS');
    this.appendValueInput('RETURN')
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField(Blockly.Msg.PROCEDURES_DEFRETURN_RETURN);
    this.setMutator(new Blockly.Mutator(['procedures_mutatorarg']));
    /*if ((this.workspace.options.comments ||
         (this.workspace.options.parentWorkspace &&
          this.workspace.options.parentWorkspace.options.comments)) &&
        Blockly.Msg.PROCEDURES_DEFRETURN_COMMENT) {
      this.setCommentText(Blockly.Msg.PROCEDURES_DEFRETURN_COMMENT);
    }*/
    this.setColour(Blockly.Blocks.procedures.HUE);
    this.setTooltip(Blockly.Msg.PROCEDURES_DEFRETURN_TOOLTIP);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setHelpUrl(Blockly.Msg.PROCEDURES_DEFRETURN_HELPURL);
    this.arguments_ = [];
    this.setStatements_(true);
    this.statementConnection_ = null;
  },
  setStatements_: Blockly.Blocks['procedures_defnoreturn'].setStatements_,
  updateParams_: Blockly.Blocks['procedures_defnoreturn'].updateParams_,
  mutationToDom: Blockly.Blocks['procedures_defnoreturn'].mutationToDom,
  domToMutation: Blockly.Blocks['procedures_defnoreturn'].domToMutation,
  decompose: Blockly.Blocks['procedures_defnoreturn'].decompose,
  compose: Blockly.Blocks['procedures_defnoreturn'].compose,
  onchange: Blockly.Blocks['procedures_defnoreturn'].onchange,
  /**
   * Return the signature of this procedure definition.
   * @return {!Array} Tuple containing three elements:
   *     - the name of the defined procedure,
   *     - a list of all its arguments,
   *     - that it DOES have a return value.
   * @this Blockly.Block
   */
  getProcedureDef: function() {
    return [this.getFieldValue('NAME'), this.arguments_, true];
  },
  getVars: Blockly.Blocks['procedures_defnoreturn'].getVars,
  renameVar: Blockly.Blocks['procedures_defnoreturn'].renameVar,
  customContextMenu: Blockly.Blocks['procedures_defnoreturn'].customContextMenu,
  callType_: 'procedures_callreturn'
};

Blockly.Blocks['procedures_mutatorcontainer'] = {
  /**
   * Mutator block for procedure container.
   * @this Blockly.Block
   */
  init: function() {
    this.appendDummyInput()
      .appendField(Blockly.Msg.PROCEDURES_MUTATORCONTAINER_TITLE);
    this.appendStatementInput('STACK');
    this.appendDummyInput('STATEMENT_INPUT')
      .appendField(Blockly.Msg.PROCEDURES_ALLOW_STATEMENTS)
      .appendField(new Blockly.FieldCheckbox('TRUE'), 'STATEMENTS');
    this.setColour(Blockly.Blocks.procedures.HUE);
    this.setTooltip(Blockly.Msg.PROCEDURES_MUTATORCONTAINER_TOOLTIP);
    this.contextMenu = false;
  }
};

Blockly.Blocks['procedures_mutatorarg'] = {
  /**
   * Mutator block for procedure argument.
   * @this Blockly.Block
   */
  init: function() {
    var field = new Blockly.FieldTextInput('x', this.validator_);
    this.appendDummyInput()
      .appendField(Blockly.Msg.PROCEDURES_MUTATORARG_TITLE)
      .appendField(field, 'NAME');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(Blockly.Blocks.procedures.HUE);
    this.setTooltip(Blockly.Msg.PROCEDURES_MUTATORARG_TOOLTIP);
    this.contextMenu = false;

    // Create the default variable when we drag the block in from the flyout.
    // Have to do this after installing the field on the block.
    field.onFinishEditing_ = this.createNewVar_;
    field.onFinishEditing_('x');
  },
  /**
   * Obtain a valid name for the procedure.
   * Merge runs of whitespace.  Strip leading and trailing whitespace.
   * Beyond this, all names are legal.
   * @param {string} newVar User-supplied name.
   * @return {?string} Valid name, or null if a name was not specified.
   * @private
   * @this Blockly.Block
   */
  validator_: function(newVar) {
    newVar = newVar.replace(/[\s\xa0]+/g, ' ').replace(/^ | $/g, '');
    return newVar || null;
  },
  /**
   * Called when focusing away from the text field.
   * Creates a new variable with this name.
   * @param {string} newText The new variable name.
   * @private
   * @this Blockly.FieldTextInput
   */
  createNewVar_: function(newText) {
    var source = this.sourceBlock_;
    if (source && source.workspace && source.workspace.options
      && source.workspace.options.parentWorkspace) {
      source.workspace.options.parentWorkspace.createVariable(newText);
    }
  }
};

Blockly.Blocks['procedures_callnoreturn'] = {
  /**
   * Block for calling a procedure with no return value.
   * @this Blockly.Block
   */
  init: function() {
    this.appendDummyInput('TOPROW')
      .appendField(this.id, 'NAME');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(Blockly.Blocks.procedures.HUE);
    // Tooltip is set in renameProcedure.
    this.setHelpUrl(Blockly.Msg.PROCEDURES_CALLNORETURN_HELPURL);
    this.arguments_ = [];
    this.quarkConnections_ = {};
    this.quarkIds_ = null;
  },
  /**
   * Returns the name of the procedure this block calls.
   * @return {string} Procedure name.
   * @this Blockly.Block
   */
  getProcedureCall: function() {
    // The NAME field is guaranteed to exist, null will never be returned.
    return /** @type {string} */ (this.getFieldValue('NAME'));
  },
  /**
   * Notification that a procedure is renaming.
   * If the name matches this block's procedure, rename it.
   * @param {string} oldName Previous name of procedure.
   * @param {string} newName Renamed procedure.
   * @this Blockly.Block
   */
  renameProcedure: function(oldName, newName) {
    if (Blockly.Names.equals(oldName, this.getProcedureCall())) {
      this.setFieldValue(newName, 'NAME');
      this.setTooltip(
        (this.outputConnection ? Blockly.Msg.PROCEDURES_CALLRETURN_TOOLTIP :
          Blockly.Msg.PROCEDURES_CALLNORETURN_TOOLTIP)
          .replace('%1', newName));
    }
  },
  /**
   * Notification that the procedure's return state has changed.
   * @param {boolean} returnState New return state
   * @this Blockly.Block
   */
  setReturn: function(returnState) {
    if (returnState) {
      this.setPreviousStatement(false);
      this.setNextStatement(false);
      this.setOutput(true);
    } else {
      this.setOutput(false);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
    if (this.rendered) {
      this.render();
    }
  },
  /**
   * Notification that the procedure's parameters have changed.
   * @param {!Array.<string>} paramNames New param names, e.g. ['x', 'y', 'z'].
   * @param {!Array.<string>} paramIds IDs of params (consistent for each
   *     parameter through the life of a mutator, regardless of param renaming),
   *     e.g. ['piua', 'f8b_', 'oi.o'].
   * @private
   * @this Blockly.Block
   */
  setProcedureParameters_: function(paramNames, paramIds) {
    // Data structures:
    // this.arguments = ['x', 'y']
    //     Existing param names.
    // this.quarkConnections_ {piua: null, f8b_: Blockly.Connection}
    //     Look-up of paramIds to connections plugged into the call block.
    // this.quarkIds_ = ['piua', 'f8b_']
    //     Existing param IDs.
    // Note that quarkConnections_ may include IDs that no longer exist, but
    // which might reappear if a param is reattached in the mutator.
    var defBlock = Blockly.Procedures.getDefinition(this.getProcedureCall(),
      this.workspace);
    var mutatorOpen = defBlock && defBlock.mutator &&
      defBlock.mutator.isVisible();
    if (!mutatorOpen) {
      this.quarkConnections_ = {};
      this.quarkIds_ = null;
    }
    if (!paramIds) {
      // Reset the quarks (a mutator is about to open).
      return;
    }
    if (goog.array.equals(this.arguments_, paramNames)) {
      // No change.
      this.quarkIds_ = paramIds;
      return;
    }
    if (paramIds.length != paramNames.length) {
      throw 'Error: paramNames and paramIds must be the same length.';
    }
    this.setCollapsed(false);
    if (!this.quarkIds_) {
      // Initialize tracking for this block.
      this.quarkConnections_ = {};
      if (paramNames.join('\n') == this.arguments_.join('\n')) {
        // No change to the parameters, allow quarkConnections_ to be
        // populated with the existing connections.
        this.quarkIds_ = paramIds;
      } else {
        this.quarkIds_ = [];
      }
    }
    // Switch off rendering while the block is rebuilt.
    var savedRendered = this.rendered;
    this.rendered = false;
    // Update the quarkConnections_ with existing connections.
    for (var i = 0; i < this.arguments_.length; i++) {
      var input = this.getInput('ARG' + i);
      if (input) {
        var connection = input.connection.targetConnection;
        this.quarkConnections_[this.quarkIds_[i]] = connection;
        if (mutatorOpen && connection &&
          paramIds.indexOf(this.quarkIds_[i]) == -1) {
          // This connection should no longer be attached to this block.
          connection.disconnect();
          connection.getSourceBlock().bumpNeighbours_();
        }
      }
    }
    // Rebuild the block's arguments.
    this.arguments_ = [].concat(paramNames);
    this.updateShape_();
    this.quarkIds_ = paramIds;
    // Reconnect any child blocks.
    if (this.quarkIds_) {
      for (var i = 0; i < this.arguments_.length; i++) {
        var quarkId = this.quarkIds_[i];
        if (quarkId in this.quarkConnections_) {
          var connection = this.quarkConnections_[quarkId];
          if (!Blockly.Mutator.reconnect(connection, this, 'ARG' + i)) {
            // Block no longer exists or has been attached elsewhere.
            delete this.quarkConnections_[quarkId];
          }
        }
      }
    }
    // Restore rendering and show the changes.
    this.rendered = savedRendered;
    if (this.rendered) {
      this.render();
    }
  },
  /**
   * Modify this block to have the correct number of arguments.
   * @private
   * @this Blockly.Block
   */
  updateShape_: function() {
    for (var i = 0; i < this.arguments_.length; i++) {
      if (this.arguments_[i] != "") {
        var field = this.getField('ARGNAME' + i);
        if (field) {
          // Ensure argument name is up to date.
          // The argument name field is deterministic based on the mutation,
          // no need to fire a change event.
          Blockly.Events.disable();
          try {
            field.setValue(this.arguments_[i]);
          } finally {
            Blockly.Events.enable();
          }
        } else {
          // Add new input.
          field = new Blockly.FieldLabel(this.arguments_[i]);
          var input = this.appendValueInput('ARG' + i)
            .setAlign(Blockly.ALIGN_RIGHT)
            .appendField(field, 'ARGNAME' + i);
          input.init();
        }
      } else {
        if (!this.getInput('ARG' + i)) {
          var input = this.appendValueInput('ARG' + i)
            .setAlign(Blockly.ALIGN_RIGHT);
          //.appendField(field, 'ARGNAME' + i);
          input.init();
        }
      }
    }
    // Remove deleted inputs.
    while (this.getInput('ARG' + i)) {
      this.removeInput('ARG' + i);
      i++;
    }
    // Add 'with:' if there are parameters, remove otherwise.
    /*
    var topRow = this.getInput('TOPROW');
    if (topRow) {
      if (this.arguments_.length) {
        if (!this.getField('WITH')) {
          topRow.appendField(Blockly.Msg.PROCEDURES_CALL_BEFORE_PARAMS, 'WITH');
          topRow.init();
        }
      } else {
        if (this.getField('WITH')) {
          topRow.removeField('WITH');
        }
      }
    }
    */
  },
  /**
   * Create XML to represent the (non-editable) name and arguments.
   * @return {!Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function() {
    var container = document.createElement('mutation');
    container.setAttribute('name', this.getProcedureCall());
    for (var i = 0; i < this.arguments_.length; i++) {
      var parameter = document.createElement('arg');
      parameter.setAttribute('name', this.arguments_[i]);
      container.appendChild(parameter);
    }
    return container;
  },
  /**
   * Parse XML to restore the (non-editable) name and parameters.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function(xmlElement) {
    var name = xmlElement.getAttribute('name');
    this.renameProcedure(this.getProcedureCall(), name);
    var args = [];
    var paramIds = [];
    for (var i = 0, childNode; childNode = xmlElement.childNodes[i]; i++) {
      if (childNode.nodeName.toLowerCase() == 'arg') {
        args.push(childNode.getAttribute('name'));
        paramIds.push(childNode.getAttribute('paramId'));
      }
    }
    this.setProcedureParameters_(args, paramIds);
  },
  /**
   * Notification that a variable is renaming.
   * If the name matches one of this block's variables, rename it.
   * @param {string} oldName Previous name of variable.
   * @param {string} newName Renamed variable.
   * @this Blockly.Block
   */
  renameVar: function(oldName, newName) {
    for (var i = 0; i < this.arguments_.length; i++) {
      if (Blockly.Names.equals(oldName, this.arguments_[i])) {
        this.arguments_[i] = newName;
        var argname = this.getField('ARGNAME' + i);
        if (argname) {
          argname.setValue(newName);
        }
      }
    }
  },
  /**
   * Procedure calls cannot exist without the corresponding procedure
   * definition.  Enforce this link whenever an event is fired.
   * @this Blockly.Block
   */
  onchange: function(event) {
    if (!this.workspace || this.workspace.isFlyout) {
      // Block is deleted or is in a flyout.
      return;
    }
    /*
    if (event.type == Blockly.Events.CREATE &&
        event.ids.indexOf(this.id) != -1) {
      // Look for the case where a procedure call was created (usually through
      // paste) and there is no matching definition.  In this case, create
      // an empty definition block with the correct signature.
      var name = this.getProcedureCall();
      var def = Blockly.Procedures.getDefinition(name, this.workspace);
      if (def && (def.type != this.defType_ ||
          JSON.stringify(def.arguments_) != JSON.stringify(this.arguments_))) {
        // The signatures don't match.
        def = null;
      }
      if (!def) {
        Blockly.Events.setGroup(event.group);
     */  /**
     * Create matching definition block.
     * <xml>
     *   <block type="procedures_defreturn" x="10" y="20">
     *     <mutation name="test">
     *       <arg name="x"></arg>
     *     </mutation>
     *     <field name="NAME">test</field>
     *   </block>
     * </xml>
     */
    /*    var xml = goog.dom.createDom('xml');
        var block = goog.dom.createDom('block');
        block.setAttribute('type', this.defType_);
        var xy = this.getRelativeToSurfaceXY();
        var x = xy.x + Blockly.SNAP_RADIUS * (this.RTL ? -1 : 1);
        var y = xy.y + Blockly.SNAP_RADIUS * 2;
        block.setAttribute('x', x);
        block.setAttribute('y', y);
        var mutation = this.mutationToDom();
        block.appendChild(mutation);
        var field = goog.dom.createDom('field');
        field.setAttribute('name', 'NAME');
        field.appendChild(document.createTextNode(this.getProcedureCall()));
        block.appendChild(field);
        xml.appendChild(block);
        Blockly.Xml.domToWorkspace(xml, this.workspace);
        Blockly.Events.setGroup(false);
      }
    } else if (event.type == Blockly.Events.DELETE) {
      // Look for the case where a procedure definition has been deleted,
      // leaving this block (a procedure call) orphaned.  In this case, delete
      // the orphan.
      var name = this.getProcedureCall();
      var def = Blockly.Procedures.getDefinition(name, this.workspace);
      if (!def) {
        Blockly.Events.setGroup(event.group);
        this.dispose(true, false);
        Blockly.Events.setGroup(false);
      }
    }*/
  },
  /**
   * Add menu option to find the definition block for this call.
   * @param {!Array} options List of menu options to add to.
   * @this Blockly.Block
   */
  customContextMenu: function(options) {
    var option = {enabled: true};
    option.text = Blockly.Msg.PROCEDURES_HIGHLIGHT_DEF;
    var name = this.getProcedureCall();
    var workspace = this.workspace;
    option.callback = function() {
      var def = Blockly.Procedures.getDefinition(name, workspace);
      def && def.select();
    };
    options.push(option);
  },
  defType_: 'procedures_defnoreturn'
};

Blockly.Blocks['procedures_callreturn'] = {
  /**
   * Block for calling a procedure with a return value.
   * @this Blockly.Block
   */
  init: function() {
    this.appendDummyInput('TOPROW')
      .appendField('', 'NAME');
    this.setOutput(true);
    this.setColour(Blockly.Blocks.procedures.HUE);
    // Tooltip is set in domToMutation.
    this.setHelpUrl(Blockly.Msg.PROCEDURES_CALLRETURN_HELPURL);
    this.arguments_ = [];
    this.quarkConnections_ = {};
    this.quarkIds_ = null;
  },
  getProcedureCall: Blockly.Blocks['procedures_callnoreturn'].getProcedureCall,
  renameProcedure: Blockly.Blocks['procedures_callnoreturn'].renameProcedure,
  setProcedureParameters_:
  Blockly.Blocks['procedures_callnoreturn'].setProcedureParameters_,
  updateShape_: Blockly.Blocks['procedures_callnoreturn'].updateShape_,
  mutationToDom: Blockly.Blocks['procedures_callnoreturn'].mutationToDom,
  domToMutation: Blockly.Blocks['procedures_callnoreturn'].domToMutation,
  renameVar: Blockly.Blocks['procedures_callnoreturn'].renameVar,
  onchange: Blockly.Blocks['procedures_callnoreturn'].onchange,
  setReturn: Blockly.Blocks['procedures_callnoreturn'].setReturn,
  customContextMenu:
  Blockly.Blocks['procedures_callnoreturn'].customContextMenu,
  defType_: 'procedures_defreturn'
};

Blockly.Blocks['procedures_ifreturn'] = {
  /**
   * Block for conditionally returning a value from a procedure.
   * @this Blockly.Block
   */
  init: function() {
    this.appendValueInput('CONDITION')
      .setCheck('Boolean')
      .appendField(Blockly.Msg.CONTROLS_IF_MSG_IF);
    this.appendValueInput('VALUE')
      .appendField(Blockly.Msg.PROCEDURES_DEFRETURN_RETURN);
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(Blockly.Blocks.procedures.HUE);
    this.setTooltip(Blockly.Msg.PROCEDURES_IFRETURN_TOOLTIP);
    this.setHelpUrl(Blockly.Msg.PROCEDURES_IFRETURN_HELPURL);
    this.hasReturnValue_ = true;
  },
  /**
   * Create XML to represent whether this block has a return value.
   * @return {!Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function() {
    var container = document.createElement('mutation');
    container.setAttribute('value', Number(this.hasReturnValue_));
    return container;
  },
  /**
   * Parse XML to restore whether this block has a return value.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function(xmlElement) {
    var value = xmlElement.getAttribute('value');
    this.hasReturnValue_ = (value == 1);
    if (!this.hasReturnValue_) {
      this.removeInput('VALUE');
      this.appendDummyInput('VALUE')
        .appendField(Blockly.Msg.PROCEDURES_DEFRETURN_RETURN);
    }
  },
  /**
   * Called whenever anything on the workspace changes.
   * Add warning if this flow block is not nested inside a loop.
   * @param {!Blockly.Events.Abstract} e Change event.
   * @this Blockly.Block
   */
  onchange: function(e) {
    if (this.workspace.isDragging()) {
      return;  // Don't change state at the start of a drag.
    }
    var legal = false;
    // Is the block nested in a procedure?
    var block = this;
    do {
      if (this.FUNCTION_TYPES.indexOf(block.type) != -1) {
        legal = true;
        break;
      }
      block = block.getSurroundParent();
    } while (block);
    if (legal) {
      /*
    // If needed, toggle whether this block has a return value.
    if (block.type == 'procedures_defnoreturn' && this.hasReturnValue_) {
      this.removeInput('VALUE');
      this.appendDummyInput('VALUE')
        .appendField(Blockly.Msg.PROCEDURES_DEFRETURN_RETURN);
      this.hasReturnValue_ = false;
    } else if (block.type == 'procedures_defreturn' &&
               !this.hasReturnValue_) {
      this.removeInput('VALUE');
      this.appendValueInput('VALUE')
        .appendField(Blockly.Msg.PROCEDURES_DEFRETURN_RETURN);
      this.hasReturnValue_ = true;
    }
    */
      this.setWarningText(null);
      if (!this.isInFlyout) {
        this.setDisabled(false);
      }
    } else {
      this.setWarningText(Blockly.Msg.PROCEDURES_IFRETURN_WARNING);
      if (!this.isInFlyout && !this.getInheritedDisabled()) {
        this.setDisabled(true);
      }
    }
  },
  /**
   * List of block types that are functions and thus do not need warnings.
   * To add a new function type add this to your code:
   * Blockly.Blocks['procedures_ifreturn'].FUNCTION_TYPES.push('custom_func');
   */
  FUNCTION_TYPES: ['procedures_defnoreturn', 'procedures_defreturn']
};

Blockly.Blocks['procedures_return'] = {
  /**
   * Block for returning a value from a procedure.
   * @this Blockly.Block
   */
  init: function() {
    this.setHelpUrl('http://c2.com/cgi/wiki?GuardClause');
    this.setColour(Blockly.Blocks.procedures.HUE);
    this.appendValueInput('VALUE')
      .appendField(Blockly.Msg.PROCEDURES_DEFRETURN_RETURN);
    this.setInputsInline(false);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(Blockly.Msg.PROCEDURES_IFRETURN_TOOLTIP);
    this.hasReturnValue_ = true;
  },
  /**
   * Called whenever anything on the workspace changes.
   * Add warning if this flow block is not nested inside a loop.
   * @this Blockly.Block
   */
  onchange: function() {
    if (!this.workspace) {
      // Block has been deleted.
      return;
    }
    var legal = false;
    // Is the block nested in a procedure?
    var block = this;
    do {
      if (block.type == 'procedures_defnoreturn' ||
        block.type == 'procedures_defreturn') {
        legal = true;
        break;
      }
      block = block.getSurroundParent();
    } while (block);
    if (legal) {
      this.setWarningText(null);
    } else {
      this.setWarningText(Blockly.Msg.PROCEDURES_IFRETURN_WARNING);
    }
  }
};


