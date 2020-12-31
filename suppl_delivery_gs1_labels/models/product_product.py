# -*- coding: utf-8 -*-

###################################################################################
#
#    Copyright (c) SUPPLiot GmbH.
#
#    This file is part of SUPPLiot GS1 SSCC Labels module
#    (see https://suppliot.eu).
#
#    See LICENSE file for full copyright and licensing details.
#
###################################################################################


from odoo import api, fields, SUPERUSER_ID, http, models, _
from odoo.exceptions import UserError

from ..common import get_gs1_barcode


class ProductProduct(models.Model):
    _inherit = 'product.product'

    def create_barcode_number(self):
        for prod in self:
            if prod.barcode and len(prod.barcode) > 0:
                raise UserError(_('Product %s already has an assigned barcode [%s]. If you are sure, you want to set a new barcode, please empty the current barcode field.') % (prod.display_name, prod.barcode))

            generated_barcode = get_gs1_barcode(self.env)
            if generated_barcode:
                prod.barcode = generated_barcode

