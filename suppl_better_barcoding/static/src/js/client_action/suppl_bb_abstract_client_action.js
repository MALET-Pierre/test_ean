/********************************************************************
*    Copyright (c) SUPPLiot GmbH.
*
*    This file is part of SUPPLiot Better Barcoding module
*    (see https://suppliot.eu).
*
*    See LICENSE file for full copyright and licensing details.
*
********************************************************************/

odoo.define('suppl_better_barcoding.suppl_bb_client_action', ['web.core', 'stock_barcode.ClientAction', 'stock_barcode.ViewsWidget'], function (require) {
    'use strict';

    var core = require('web.core');
    var ClientAction = require('stock_barcode.ClientAction');
    var ViewsWidget = require('stock_barcode.ViewsWidget');

    var _t = core._t;

    var supplBetterClientAction = ClientAction.include({
        print_and_exit: false,
        recent_barcode: '',

        custom_events: _.extend({}, ClientAction.prototype.custom_events, {
            suppl_bb_validate_and_print_trigger: '_validate_and_print',
            suppl_bb_save_trigger: '_on_save_trigger',
        }),

        init: function (parent, action) {
            this.qty_by_lots = {};
            this.demand_by_products = {};
            this.bb_settings = {
                show_add_product_btn: true,
                show_packaging_btn: true,
                show_previous_next_btn: true,
                show_validate_btn: true,
                show_validateprint_btn: true,
                immediate_transfer: false
            };

            this._super.apply(this, arguments);
            this.commands['O-BTN.validateprint'] = this._validate_and_print.bind(this);
            this.commands['O-BTN.saveandcontinue'] = this._on_save_trigger.bind(this);
        },

        willStart: function () {
            var self = this;

            return self._super.apply(self, arguments).then(
                function () {
                    self.setBetterBarcodingSettings();
                    self.getExtendedQtyInfos();
                });
        },

        setBetterBarcodingSettings: function () {
            if (!this.currentState) return;
            if (!this.bb_settings) {
                this.bb_settings = {};
            }

            for (let settingsKey in this.bb_settings) {
                if (settingsKey in this.currentState) {
                    this.bb_settings[settingsKey] = this.currentState[settingsKey];
                }
            }
        },

        getExtendedQtyInfos: function () {
            if (this.actionParams.model === 'stock.inventory') {
                return;
            }

            this.qty_by_lots = this.initialState
                .move_line_ids
                .reduce(function (map, obj) {
                    map[obj.lot_id[1]] = obj.lot_qty;
                    return map;
                }, {});

            this.demand_by_products = this.initialState
                .move_ids
                .reduce(function (map, obj) {
                    map[obj.product_id[0]] = obj.product_uom_qty;
                    return map;
                }, {});
        },

        _step_lot: function (barcode, linesActions) {
            let lot_name = barcode;
            let self = this;

            if (this.actionParams.model === 'stock.inventory') {
                return self._super.apply(self, arguments);
            }

            return self._super.apply(self, arguments).then(function (x) {
                let rslt = x;
                let location_id = self._getLocationId();
                if (!location_id) return Promise.resolve(rslt);
                if (self.qty_by_lots && lot_name in self.qty_by_lots) {
                    return Promise.resolve(rslt);
                }

                return self._rpc({
                    'route': '/suppl_better_barcoding/get_qty_for_lot',
                    'params': {
                        'lot_name': lot_name,
                        'location_id': location_id.id
                    }
                }).then(function (qty_rslt) {
                    self.qty_by_lots[lot_name] = qty_rslt || 0;

                    return Promise.resolve(rslt);
                });
            });
        },

        _print_picking_type_defined_reports: function () {
            if (!this.currentState.validate_and_print_report_ids)
                return;

            var self = this;
            let promises = self.currentState.validate_and_print_report_ids
                .map(function (rep) {
                    return self.mutex.exec(function () {
                        if (rep.report_amount <= 0) {
                            rep.report_amount = 1
                        }

                        self.displayNotification({
                            title: _t('Printing...'),
                            message: _.str.sprintf(_t('Print %d of report/label "%s"'), rep.report_amount, rep.report_name),
                            type: 'info',
                            sticky: false
                        });

                        return self.do_action(rep.report_id, {
                            'additional_context': {
                                'active_ids': Array.apply(null, Array(rep.report_amount)).map(_ => self.actionParams.pickingId),
                                'active_model': 'stock.picking',
                            }
                        });
                    });
                });

            return Promise.all(promises);
        },

        _onExit: function (ev) {
            ev.stopPropagation();
            var super_method = this._super.bind(this);

            if (this.print_and_exit) {
                this.print_and_exit = false;

                if (this.currentState.validate_and_print_available) {
                    return this._print_picking_type_defined_reports()
                        .then(function (rslt) {
                            return super_method(ev);
                        });
                }

                if (this._printDeliverySlip) {
                    this._printDeliverySlip()
                }

                if (this._onPrintInventory) {
                    this._onPrintInventory(ev)
                }
            }

            return super_method(ev);
        },

        _on_save_trigger: function (ev) {
            this._onReload(ev);
        },

        _onBarcodeScanned: function (barcode) {
            this.recent_barcode = barcode;
            return this._super.apply(this, arguments);
        },

        _endBarcodeFlow: function () {
            this._super.apply(this);
            this.recent_barcode = '';
        },

        /**
         * Handles the `edit_product` OdooEvent. It destroys `this.linesWidget` and displays an instance
         * of `ViewsWidget` for the line model.
         *
         * Editing a line should not "end" the barcode flow, meaning once the changes are saved or
         * discarded in the opened form view, the user should be able to scan a destination location
         * (if the current flow allows it) and enforce it on `this.scanned_lines`.
         *
         * @private
         * @param {OdooEvent} ev
         */
        _onEditLine: function (ev) {
            ev.stopPropagation();

            if (this.actionParams.model === 'stock.inventory') {
                return this._super.apply(this, arguments);
            }

            this.linesWidgetState = this.linesWidget.getState();
            this.linesWidget.destroy();
            this.headerWidget.toggleDisplayContext('specialized');

            // If we want to edit a not yet saved line, keep its virtual_id to match it with the result
            // of the `applyChanges` RPC.
            var virtual_id = _.isString(ev.data.id) ? ev.data.id : false;

            var self = this;
            this.mutex.exec(function () {
                return self._save().then(function () {
                    let id = ev.data.id;
                    if (virtual_id) {
                        var currentPage = self.pages[self.currentPageIndex];
                        var rec = _.find(currentPage.lines, function (line) {
                            return line.dummy_id === virtual_id;
                        });
                        id = rec.id;
                    }

                    let related_line = self._get_line_by_id(id);
                    if (!related_line) return;

                    self.ViewsWidget = new ViewsWidget(
                        self,
                        self.actionParams.model,
                        'suppl_better_barcoding.suppl_bb_stock_move_line_edit',
                        {show_product_ids: [related_line.product_id.id]},
                        {currentId: self.currentState.id}
                    );
                    return self.ViewsWidget.appendTo(self.$('.o_content'));
                });
            });
        },

        _validate_and_print: function (ev) {
            let self = this;

            if (this._validate && this.currentState.validate_and_print_available) {
                self.print_and_exit = true;
                return this._validate(ev);
            } else if (this._validate && this._printDeliverySlip) {
                self.print_and_exit = true;

                return this._validate(ev);
            } else if (this._validate && this._onPrintInventory) {
                self.print_and_exit = true;

                return this._validate(ev);
            } else {
                self.print_and_exit = false;

                if (this._validate) {
                    return this._validate(ev);
                }

                if (this._printDeliverySlip) {
                    return this._printDeliverySlip()
                }

                if (this._onPrintInventory) {
                    return this._onPrintInventory(ev)
                }
            }
        },

        _get_line_by_id: function (id) {
            if (!id) return null;
            let page_lines = this._get_current_page_lines();
            if (!page_lines) return;

            return _.find(page_lines, function (line) {
                return line.id == id || line.dummy_id == id || line.virtual_id == id;
            }) || this.linesWidget.get_line_by_id(id);
        },

        _get_current_page_lines() {
            if (!this.pages) return null;
            if (this.currentPageIndex < 0 || this.currentPageIndex > (this.pages.length - 1)) return null;

            let currentPage = this.pages[this.currentPageIndex];
            if (!currentPage || !currentPage.lines) return null;

            return currentPage.lines;
        }
    });

    core.action_registry.add('suppl_bb_stock_barcode_client_action', supplBetterClientAction);

    return supplBetterClientAction;
});
