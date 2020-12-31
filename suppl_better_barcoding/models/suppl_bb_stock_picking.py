# -*- coding: utf-8 -*-

###################################################################################
#
#    Copyright (c) SUPPLiot GmbH.
#
#    This file is part of SUPPLiot Better Barcoding module
#    (see https://suppliot.eu).
#
#    See LICENSE file for full copyright and licensing details.
#
###################################################################################

from odoo import api, fields, models, SUPERUSER_ID, _
from odoo.tools.float_utils import float_compare, float_is_zero, float_round
from odoo.exceptions import UserError, ValidationError


class SupplBetterPicking(models.Model):
    _name = "stock.picking"
    _inherit = "stock.picking"

    move_line_ids_for_context = fields.One2many('stock.move.line',
                                                'picking_id',
                                                'Operations without package for product context',
                                                domain=lambda self: [
                                                    ('product_id.id', 'in',
                                                     self.env.context.get('show_product_ids', [True]))])

    move_line_ids_for_context_product_name = fields.Char('Operations product names without package for product context',
                                                         related='move_line_ids_for_context.product_id.display_name',
                                                         readonly=True)

    unavailable_moves = fields.One2many('stock.move', 'picking_id', compute='_compute_unavailable_moves')

    def _compute_unavailable_moves(self):
        self.ensure_one()
        ids = list((o.move_id.id for o in self.move_line_ids))
        moves = self.move_lines.filtered(lambda x: x.id not in ids)
        self.unavailable_moves = moves

    def get_barcode_view_state(self):
        pickings = super(SupplBetterPicking, self).get_barcode_view_state()
        if not pickings or len(pickings) <= 0:
            return

        for picking in pickings:
            picking['immediate_transfer'] = self.env['stock.picking'].browse(picking['id'])\
                .read(['immediate_transfer'])[0]['immediate_transfer']

            for move_line_id in picking['move_line_ids']:
                if not move_line_id['lot_id'] or not move_line_id['location_id']:
                    continue
                move_line_id['lot_qty'] = sum(self.env['stock.quant'].search(
                    [('lot_id.id', '=', move_line_id['lot_id'][0]),
                     ('location_id.id', '=', move_line_id['location_id']['id'])]).mapped('quantity'))

            picking['move_ids'] = self.env['stock.move'].search([('picking_id', '=', picking['id'])]) \
                .read([
                'product_id',
                'product_uom_qty',
                'location_id',
            ])

            picking['validate_and_print_report_ids'] = []
            picking['validate_and_print_available'] = False

            if not picking['picking_type_id'] or len(picking['picking_type_id']) <= 0:
                continue

            picking_type = self.env['stock.picking.type'].browse(picking['picking_type_id'][0])
            if not picking_type:
                continue

            picking['show_add_product_btn'] = picking_type.barcode_show_add_product_btn
            picking['show_packaging_btn'] = picking_type.barcode_show_packaging_btn
            picking['show_previous_next_btn'] = picking_type.barcode_show_previous_next_btn
            picking['show_validate_btn'] = picking_type.barcode_show_validate_btn
            picking['show_validateprint_btn'] = picking_type.barcode_show_validateprint_btn

            if picking_type.validate_and_print_report_ids and len(picking_type.validate_and_print_report_ids) > 0:
                picking['validate_and_print_available'] = True
                picking['validate_and_print_report_ids'] = picking_type.validate_and_print_report_ids.mapped(
                    lambda x: {
                        'report_id': x.action_report_id.id,
                        'report_name': x.action_report_id.name,
                        'report_amount': x.validate_and_print_picking_type_duplicates
                    })

        return pickings

    def put_in_pack(self):
        self.ensure_one()

        if self.state in ('done', 'cancel'):
            return

        if self.picking_type_id.automatic_packaging_mode == 'standard':
            return super(SupplBetterPicking, self).put_in_pack()

        picking_move_lines = self.move_line_ids
        if not self.picking_type_id.show_reserved and not self.env.context.get('barcode_view'):
            picking_move_lines = self.move_line_nosuggest_ids

        move_line_ids = picking_move_lines.filtered(lambda ml: float_compare(ml.qty_done, 0.0,
                                                                             precision_rounding=ml.product_uom_id.rounding) > 0
                                                               and not ml.result_package_id)

        if not move_line_ids:
            move_line_ids = picking_move_lines.filtered(lambda ml: float_compare(ml.product_uom_qty, 0.0,
                                                                                 precision_rounding=ml.product_uom_id.rounding) > 0 and float_compare(
                ml.qty_done, 0.0,
                precision_rounding=ml.product_uom_id.rounding) == 0)

        if not move_line_ids:
            raise UserError(_("Please add 'Done' qantitites to the picking to create a new pack."))

        move_line_groups = {}
        if self.picking_type_id.automatic_packaging_mode == 'product':
            for move_line in move_line_ids:
                if move_line.product_id.product_tmpl_id.id in move_line_groups:
                    move_line_groups[move_line.product_id.product_tmpl_id.id] |= move_line
                else:
                    move_line_groups[move_line.product_id.product_tmpl_id.id] = move_line

        elif self.picking_type_id.automatic_packaging_mode == 'charge':
            for move_line in move_line_ids:
                key = "%s-%s" % (move_line.product_id.id, move_line.lot_id.id)
                if key in move_line_groups:
                    move_line_groups[key] |= move_line
                else:
                    move_line_groups[key] = move_line

        elif self.picking_type_id.automatic_packaging_mode == 'variant':
            for move_line in move_line_ids:
                if move_line.product_id.id in move_line_groups:
                    move_line_groups[move_line.product_id.id] |= move_line
                else:
                    move_line_groups[move_line.product_id.id] = move_line

        for move_line_group in move_line_groups.values():
            res = self._put_in_pack(move_line_group)

        return res

    def button_validate(self):
        self.ensure_one()
        if not self.move_lines and not self.move_line_ids:
            raise UserError(_('Please add some items to move.'))

        if self.picking_type_id.packaging_required:
            self.put_in_pack()

        # check if any move line is not put in a package -> throw error if packaging required by picking_type_id
        if self.picking_type_id.packaging_required and any(not move_line.result_package_id for move_line in
                                                           self.move_line_ids.filtered(
                                                               lambda m: m.state not in ('done', 'cancel'))):
            raise UserError(_('For this operation it is required to put all lines in packages.'))

        return super(SupplBetterPicking, self).button_validate()
