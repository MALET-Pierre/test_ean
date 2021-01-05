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
from odoo.exceptions import UserError, ValidationError


class SupplBetterPickingType(models.Model):
    _name = "stock.picking.type"
    _inherit = "stock.picking.type"

    user_friendly_name = fields.Char('User friendly operation type name', translate=False)
    user_friendly_description = fields.Char('User friendly operation type description', translate=False)
    user_friendly_notes = fields.Char('User friendly operation type notes', translate=False)
    user_friendly_steps = fields.One2many('stock.picking.type.step.description', 'stock_picking_id')

    validate_and_print_report_ids = fields.One2many('ir.actions.report.to.picking.type',
                                                         'stock_picking_type_id',
                                                         string='Reports', copy=False,
                                                         help='Set reports here, that are printed for the barcode command "Validate and Print".')

    packaging_required = fields.Boolean('Packaging required')
    automatic_packaging_mode = fields.Selection([
        ('standard', 'Standard'),
        ('product', 'Per product'),
        ('variant', 'Per Variant'),
        ('charge', 'Per Charge')
    ], string='Automatic packaging mode', default='standard',
        help="According to packaging mode configuration, the products can be automatically put in packages:\n"
             "  - Standard: All products will be put in one package.\n"
             "  - Per Product: There will be one package per product. The same products will be put in the same package.\n"
             "  - Per Variant: There will be one package per product variant. The same variants will be put in the same package.\n"
             "  - Per Charge: There will be one package per lot or serial number. The same lots and serials will be put in the same package.\n"
    )

    barcode_show_add_product_btn = fields.Boolean("Show 'add product' button in barcode app.", default=True)
    barcode_show_packaging_btn = fields.Boolean("Show 'packaging button' in barcode app.", default=True)
    barcode_show_previous_next_btn = fields.Boolean("Show 'previous/next' button in barcode app.", default=True)
    barcode_show_validate_btn = fields.Boolean("Show 'validate' button in barcode app.", default=True)
    barcode_show_validateprint_btn = fields.Boolean("Show 'print and validate' button in barcode app.", default=True)


class SupplPickingTypeStepDescription(models.Model):
    _name = "stock.picking.type.step.description"
    _description = "Step by step instructions for stock picking operation types"
    _order = "sequence"

    stock_picking_id = fields.Many2one('stock.picking.type', required=True)
    sequence = fields.Integer('sequence', default=1)

    step_short_description = fields.Char('Step short description', required=False)
    step_description_details = fields.Char('Step details', required=False)
    step_show_barcode = fields.Boolean('Show barcode for this step', required=False)
    step_show_custom_barcode = fields.Char('Custom barcode or command', required=False)


class IrActionReportToPickingType(models.Model):
    _name = 'ir.actions.report.to.picking.type'
    _description = 'Relation between stock.picking.type and ir.actions.report'

    stock_picking_type_id = fields.Many2one('stock.picking.type', string="Related stock picking type")
    action_report_id = fields.Many2one('ir.actions.report', string="Related report to print",
                                       domain="[('model', '=', 'stock.picking')]")

    validate_and_print_picking_type_duplicates = fields.Integer('Amount', default=1,
                                                                help='Set the amount of duplicates to print.')

    @api.constrains('validate_and_print_picking_type_duplicates')
    def _check_description(self):
        for record in self:
            if record.validate_and_print_picking_type_duplicates <= 0:
                raise ValidationError("Amount must be larger than zero.")


class IrActionReportForBarcoding(models.Model):
    _name = 'ir.actions.report'
    _inherit = 'ir.actions.report'

    validate_and_print_picking_type_id = fields.One2many('ir.actions.report.to.picking.type',
                                                         'action_report_id',
                                                         string='Stock Picking Types',
                                                         help='When setting a stock picking type here, the report will be printed for the barcode operation "Validate and Print".')
