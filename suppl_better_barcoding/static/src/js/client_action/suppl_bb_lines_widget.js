/********************************************************************
*    Copyright (c) SUPPLiot GmbH.
*
*    This file is part of SUPPLiot Better Barcoding module
*    (see https://suppliot.eu).
*
*    See LICENSE file for full copyright and licensing details.
*
********************************************************************/

odoo.define('suppl_better_barcoding.LinesWidget', ['web.core', 'web.Dialog', 'stock_barcode.LinesWidget'], function (require) {
    'use strict';

    var LinesWidget = require('stock_barcode.LinesWidget');
    var core = require('web.core');
    var Dialog = require('web.Dialog');

    var _t = core._t;

    LinesWidget.include({
        events: _.extend({}, LinesWidget.prototype.events, {
            'click .suppl_bb_validate_and_print': '_onClickValidateAndPrint',
            'click .suppl_bb_save': '_onClickSave',
        }),

        init: function (parent, page, pageIndex, nbPages) {
            this._super.apply(this, arguments);

            this.qty_by_lots = parent.qty_by_lots;
            this.demand_by_products = parent.demand_by_products;
            this.bb_settings = parent.bb_settings;
        },

        /**
         * Handles the click on the `validate button`.
         *
         * @private
         * @param {MouseEvent} ev
         */
        _onClickValidateAndPrint: function (ev) {
            ev.stopPropagation();
            this.trigger_up('suppl_bb_validate_and_print_trigger');
        },

        /**
         * Handles the click on the `validate button`.
         *
         * @private
         * @param {MouseEvent} ev
         */
        _onClickSave: function (ev) {
            ev.stopPropagation();
            this.trigger_up('suppl_bb_save_trigger');
        },

        /**
         * Highlight and scroll to a specific line in the current page after removing the highlight on
         * the other lines.
         *
         * @private
         * @param {Jquery} $line
         */
        _highlightLine: function ($line, doNotClearLineHighlight) {
            let self = this;
            try {
                if (self.model === 'stock.inventory') {
                    self._super.apply(self, arguments);
                    return;
                }

                var $body = this.$el.filter('.o_barcode_lines');
                // Remove the highlight from the info line.
                $body.find('.o_highlight_info').removeClass('o_highlight_info');
                $line.toggleClass('o_highlight_green', false);
                $line.toggleClass('o_highlight_red', false);
                $line.toggleClass('o_highlight_warning', false);
                $line.toggleClass('o_highlight_info', false);

                // Highlight `$line`.
                $line.toggleClass('o_highlight', true);
                $line.parents('.o_barcode_lines').toggleClass('o_js_has_highlight', true);

                let isReservationProcessed = this._isReservationProcessedLine($line);
                switch (isReservationProcessed) {
                    case -2:
                        $line.toggleClass('o_highlight_red', true);
                        break;
                    case -1:
                        $line.toggleClass('o_highlight_warning', true);
                        break;
                    case 1:
                        $line.toggleClass('o_highlight_green', true);
                        break;
                    default:
                        $line.toggleClass('o_highlight_info', true);
                        break;
                }

                // Scroll to `$line`.
                $body.animate({
                    scrollTop: $body.scrollTop() + $line.position().top - $body.height() / 2 + $line.height() / 2
                }, 500);
            } catch (e) {
                // ignore js errors
            }
        },

        _isReservationProcessedLine: function ($line) {
            if (this.model === 'stock.inventory') {
                return this._super.apply(this, arguments);
            }

            let line = this.get_line_by_id($line.data('id'));
            if (!line) return 0;

            var qties = $line.find('.o_barcode_scanner_qty').text();
            qties = qties.split('/');

            // lot stock qty is negativ --> return error
            if (this.negative_lot_qty(parseInt(qties[0], 10), line)) {
                this._setErrorMsgUi($line, _t('Warning: Negative quantity of this lot.'));
                return -2
            }

            if (this.bb_settings.immediate_transfer) {
                this._setErrorMsgUi($line, '');
                return 0;
            }

            // product not ordered --> return warning
            if (this.demand_by_products && !(line.product_id.id in this.demand_by_products)) {
                this._setErrorMsgUi($line, _t('Warning: Product is not ordered(test pma).'));
                return -2;
            }

            let current_qty = parseInt(qties[0], 10);
            let demand_qty = this.demand_by_products[line.product_id.id];
            if (current_qty > demand_qty) {
                this._setErrorMsgUi($line, _t('Warning: More products scanned than ordered.'));
                return -2; // too much qty scanned --> return error
            } else if (current_qty < demand_qty) {
                this._setErrorMsgUi($line, '');
                return 0; // still in progress
            } else if (current_qty === demand_qty) {
                this._setErrorMsgUi($line, '');
                return 1; // demand fullfiled --> return okay
            } else {
                this._setErrorMsgUi($line, '');
                return 0;
            }
        },

        negative_lot_qty: function (currentQty, line) {
            try {
                if (!line) return;
                if (currentQty === 0) return;

                let lot_names = (line.lot_display_text || this.findLotNameForLine(line)).split(' | ');
                if (!lot_names || lot_names.length <= 0) return;

                let self = this;
                for (let i = 0; i <= lot_names.length; i++) {
                    let lt_split = lot_names[0].trim().split(" ");
                    let lt_name = lt_split[0].trim();
                    let lt_qty = lt_split.length > 1 ? parseInt(lt_split[1]
                        .replace('(', '')
                        .replace('x)', '')
                        .trim(), 10) : 1;

                    let current_lotQty = 0;
                    if (this.qty_by_lots && lt_name in this.qty_by_lots) {
                        current_lotQty = this.qty_by_lots[lt_name]
                    }
                    return (current_lotQty - lt_qty) < 0;
                }

                return false;
            } catch (e) {
                return false;
            }
        },

        incrementProduct: function (id_or_virtual_id, qty, model, doNotClearLineHighlight) {
            if (this.model === 'stock.inventory') {
                this._super.apply(this, arguments);
                return;
            }

            let line = this.get_line_by_id(id_or_virtual_id);
            if (!line) {
                return;
            }

            let existingLine = this.findExistingSimilarLine(line);
            if (existingLine && existingLine.id) {
                arguments[0] = existingLine.id;
            } else if (existingLine && existingLine.virtual_id) {
                arguments[0] = existingLine.virtual_id;
            } else if (line && line.id) {
                arguments[0] = line.id;
            } else if (line && line.virtual_id) {
                arguments[0] = line.virtual_id;
            } else {
                arguments[0] = id_or_virtual_id;
            }

            this._super.apply(this, arguments);

            let lotname = this.findLotNameForLine(line);
            this._updateLotText(existingLine || line, lotname, 1);
            this._setLotNameUi($("[data-id='" + arguments[0] + "']"), (((existingLine || line).lot_display_text) || (existingLine || line).lot_id[1]));
        },

        findLotNameForLine: function (line) {
            let lotname = line.lot_name;
            if (!lotname && this.__parentedParent && this.__parentedParent.currentStep === 'lot' && this.__parentedParent.recent_barcode) {
                lotname = this.__parentedParent.recent_barcode
            }
            if (!lotname && line.lot_id && line.lot_id.length > 1 && line.lot_id[1]) {
                lotname = line.lot_id[1]
            }

            return lotname;
        },

        setLotName: function (id_or_virtual_id, lotName) {
            if (this.model === 'stock.inventory') {
                this._super.apply(this, arguments);
                return;
            }

            return;
        },

        addProduct: function (lineDescription, model, doNotClearLineHighlight) {
            if (this.model === 'stock.inventory') {
                this._super.apply(this, arguments);
                return;
            }

            let existingLine = this.findExistingSimilarLine(lineDescription);
            if (existingLine && existingLine.virtual_id && this.$("[data-id='" + existingLine.virtual_id + "']").length <= 0) {
                // new line which does not exist in view yet -> call _super.addProduct
                this._super.apply(this, arguments);

                let lot_name = this.findLotNameForLine(lineDescription);
                this._updateLotText(existingLine, lot_name, 0);
                this._setLotNameUi(this.$("[data-id='" + existingLine.virtual_id + "']"), existingLine.lot_display_text);

                return;
            }

            // Already existing line, just increment quantity of found line
            //
            // !!! Attention: Pass original new line (lineDescription) and not existing line
            //                -> incrementProduct function checks for existing lines to, but needs scanned lot information from new line!
            //                If you pass the existing line, it would increment the lot qty incorrectly.
            //
            // For example: Scan lot A1 three times -> QTY is 3 with A1 (3x)
            //              Scan lot B2 two times -> QTY is now 5 with A1 (4x) and B2 (1x) !!!
            if (existingLine) {
                this.incrementProduct(lineDescription.id || lineDescription.virtual_id, 1, model, doNotClearLineHighlight);
                return;
            }

            // Default fallback to _super
            this._super.apply(this, arguments);
        },

        findExistingSimilarLine: function (lineDescription) {
            let existingLine = this.page.lines.find(x =>
                x.product_id.id === lineDescription.product_id.id &&
                (!x.product_uom_id || x.product_uom_id[0] === lineDescription.product_uom_id[0]) &&
                x.location_dest_id.id === lineDescription.location_dest_id.id
            );

            if (!existingLine && this.__parentedParent && this.__parentedParent.pages && this.__parentedParent.pages[this.pageIndex]) {
                existingLine = this.__parentedParent.pages[this.pageIndex].lines.find(x =>
                    x.product_id.id === lineDescription.product_id.id &&
                    (!x.product_uom_id || x.product_uom_id[0] === lineDescription.product_uom_id[0]) &&
                    x.location_dest_id.id === lineDescription.location_dest_id.id
                );
            }

            return existingLine;
        },

        /**
         * Highlight the validate button if needed.
         *
         * @private
         */
        _highlightValidateButtonIfNeeded: function () {
            this._super.apply(this);

            var $validate = this.$('.suppl_bb_validate_and_print');
            var shouldHighlight;
            if ($validate.hasClass('o_hidden') === true) {
                shouldHighlight = false;
            } else {
                shouldHighlight = this._isReservationProcessed();
            }
            if (shouldHighlight) {
                // FIXME: is it my job?
                $validate.prop('disabled', false);
                $validate.toggleClass('btn-secondary', false);
                $validate.toggleClass('btn-success', true);
            } else {
                $validate.toggleClass('btn-secondary', true);
                $validate.toggleClass('btn-success', false);
            }
            return shouldHighlight;
        },

        getProductLines: function (lines) {
            if (this.model === 'stock.inventory') {
                return this._super.apply(this, arguments);
            }

            let self = this;
            if (!this.show_entire_packs) {
                return lines.reduce(function (r, a) {
                    let existing = r.find(x =>
                        x.product_id.id === a.product_id.id &&
                        (!x.product_uom_id || x.product_uom_id[0] === a.product_uom_id[0]) &&
                        x.location_dest_id.id === a.location_dest_id.id
                    );
                    if (existing) {
                        existing.qty_done += a.qty_done;
                        self._updateLotText(existing, a.lot_id[1], a.qty_done);
                    } else {
                        a.lot_display_text = a.lot_id ? a.lot_id[1] + ' (' + a.qty_done + 'x)' : '';
                        if (self.demand_by_products && a.product_id.id in self.demand_by_products) {
                            a.product_uom_qty = self.demand_by_products[a.product_id.id];
                        }
                        r.push(a);
                    }

                    return r;
                }, []);
            }

            return _.filter(lines, function (line) {
                return !line.package_id;
            });
        },

        _renderLines: function () {
            let self = this;
            self._super.apply(self);

            var $validate = this.$('.suppl_bb_validate_and_print');
            if (this.pageIndex + 1 !== this.nbPages) {
                $validate.toggleClass('o_hidden');
            }

            if (!this.page.lines.length) {
                $validate.prop('disabled', true);
                return;
            }

            let $lines = this.$el.filter('.o_barcode_lines').find('.o_barcode_line');
            if ($lines) {
                $lines.each(function (idx) {
                    self._highlightLine($(this), false);
                });
            }
        },

        get_line_by_id: function (id) {
            if (!id) return null;
            if (!this.page.lines) return null;

            let found = _.find(this.page.lines, function (line) {
                return line.id == id || line.dummy_id == id || line.virtual_id == id;
            });
            if (found) return found;

            if (!this.__parentedParent) return null;
            return _.find(this.__parentedParent.pages[this.pageIndex].lines, function (line) {
                return line.id == id || line.dummy_id == id || line.virtual_id == id;
            });
        },

        _updateLotText: function (line, new_lot, new_qty) {
            if (!new_lot) return;

            let existing_lots = [];
            // Find existing lot infos and calculate correct qty
            let lot_to_set = (line.lot_display_text || line.lot_name || line.lot_id[1] || new_lot).split('|')
                .map(x => {
                    let lt_split = x.trim().split(' ');
                    let lt_name = lt_split[0].trim();
                    existing_lots.push(lt_name);

                    let lt_qty = lt_split.length > 1 ? parseInt(lt_split[1]
                            .replace('(', '')
                            .replace('x)', '')
                            .trim(), 10)
                        : 1;

                    if (lt_name === new_lot) {
                        lt_qty += new_qty;
                    }

                    return lt_name + ' (' + lt_qty + 'x)';
                }).join(' | ');

            // Append lot number if not already in text
            if (_.findIndex(existing_lots, function(existing) {
                return existing === new_lot;
            }) === -1) {
                lot_to_set += ' | ' + new_lot + ' (' + new_qty + 'x)';
            }

            line.lot_display_text = lot_to_set
        },

        _setLotNameUi: function (line, name) {
            if (!line || !line.length) return;

            var $lotName = line.find('.o_line_lot_name');
            var $lotId = line.find('.o_line_lot_id');
            if ($lotId && $lotId.length) {
                $lotId.replaceWith($('<span>', {
                    class: 'o_line_lot_id',
                    text: name
                }));
            }

            if ($lotName && $lotName.length) {
                $lotName.replaceWith($('<span>', {
                    class: 'o_line_lot_name',
                    text: ''
                }));
            }

        },

        _setErrorMsgUi: function (line, msg) {
            if (!line || !line.length) return;

            var $errorDiv = line.find('.o_line_scan_error_msg_wrapper');
            if (!msg) {
                $errorDiv.hide();
            } else {
                $errorDiv.show();
            }

            var $errorSpan = line.find('.o_line_scan_error_msg');
            if ($errorSpan && $errorSpan.length) {
                $errorSpan.replaceWith($('<span>', {
                    class: 'o_line_scan_error_msg',
                    text: msg
                }));
            }
        },
    });
});

