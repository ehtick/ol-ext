/*	Copyright (c) 2016 Jean-Marc VIGLINO,
  released under the CeCILL-B license (French BSD license)
  (http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
import ol_control_Control from 'ol/control/Control.js'
import { getUid as ol_util_getUid } from 'ol/util.js'

import ol_ext_element from '../util/element.js'

/** A simple push button control
 * @constructor
 * @extends {ol_control_Control}
 * @param {Object=} options Control options.
 *  @param {String} [options.id] button id, default generate a unique id
 *  @param {String} [options.className] class of the control
 *  @param {String} [options.classButton] class of the button
 *  @param {String} [options.title] title of the control
 *  @param {String} [options.name] an optional name, default none
 *  @param {String} [options.html] html to insert in the control
 *  @param {function} [options.handleClick] callback when control is clicked (or use change:active event)
 *  @param {Object} [options.attributes] key value attributes to set on the button element
 */
var ol_control_Button = class olcontrolButton extends ol_control_Control {
  constructor(options) {
    options = options || {};

    var element = document.createElement('div');
    element.className = (options.className || '') + " ol-button ol-unselectable ol-control";
    super({
      element: element,
      target: options.target
    });

    var self = this;

    var bt = this.button_ = document.createElement(/ol-text-button/.test(options.className) ? "div" : "button");
    // Button id
    if (options.id) {
      bt.setAttribute('id', options.id);
    } else {
      bt.setAttribute('id', 'ol-button-' + ol_util_getUid(this));
    }

    this.button_.className = options.classButton || '';
    bt.type = "button";
    if (options.title) {
      bt.title = options.title;
    }
    if (options.name) {
      bt.name = options.name;
    }
    if (options.html instanceof Element){
      bt.appendChild(options.html);
    } else {
      bt.innerHTML = options.html || "";
    }
    var evtFunction = function (e) {
      if (e && e.preventDefault) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (options.handleClick) {
        options.handleClick.call(self, e);
      }
    };
    bt.addEventListener("click", evtFunction);
    // bt.addEventListener("touchstart", evtFunction);
    element.appendChild(bt);

    // Try to get a title in the button content
    if (!options.title && bt.firstElementChild) {
      bt.title = bt.firstElementChild.title;
    }

    // Set the control properties
    if (options.title) {
      this.set("title", options.title);
    }
    if (options.title) {
      this.set("title", options.title);
    }
    if (options.name) {
      this.set("name", options.name);
    }
    // Set button element attributes
    for (var p in options.attributes || {}) {
      this.button_.setAttribute(p, options.attributes[p]);
    }
  }
  /** Set the control visibility
  * @param {boolean} b
  */
  setVisible(val) {
    if (val) {
      ol_ext_element.show(this.element);
    } else {
      ol_ext_element.hide(this.element);
    }
  }
  /**
   * Test if the control is disabled.
   * @return {bool}
   * @api stable
   */
  getDisable() {
    var button = this.element.querySelector('button');
    return button && button.disabled;
  }
  /** Disable the control button. 
   * @param {bool} b disable (or enable) the control, default false (enable)
   * @api stable
   */
  setDisable(b) {
    if (this.getDisable() == b) return;
    this.element.querySelector('button').disabled = b;
  }
  /**
   * Set the button title
   * @param {string} title
   */
  setTitle(title) {
    this.button_.setAttribute('title', title);
  }
  /**
   * Set the button html
   * @param {string} html
   */
  setHtml(html) {
    ol_ext_element.setHTML(this.button_, html);
  }
  /**
   * Get the button element
   * @returns {Element}
   */
  getButtonElement() {
    return this.button_;
  }
}

export default ol_control_Button
