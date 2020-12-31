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

from odoo import fields, models, api


class SupplBetterResConfigSettings(models.TransientModel):
    _name = 'res.config.settings'
    _inherit = 'res.config.settings'

    group_picking_slip_unavailable = fields.Boolean("Show unavailable moves on picking operation slip",
                                                       implied_group='suppl_better_barcoding.group_picking_slip_unavailable')
