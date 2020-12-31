# -*- coding: utf-8 -*-

###################################################################################
#
#    Copyright (c) SUPPLiot GmbH.
#
#    This file is part of SUPPLiot SVG Barcodes module
#    (see https://suppliot.eu).
#
#    See LICENSE file for full copyright and licensing details.
#
###################################################################################

{
    'name': 'SVG Barcodes',
    'summary': 'High resolution SVG barcodes.',
    'description': """
This module adds an alternative barcode controller which generates high resolution svg barcodes.

================================================================================================

Support
------------------------------------------------------------------------------------------------
Email: support@suppliot.eu


Keywords
------------------------------------------------------------------------------------------------
Barcode, High resolution, SVG 
""",
    'author': 'SUPPLiot GmbH',
    'contributors': ['SUPPLiot GmbH'],
    'website': '',
    'category': 'Tools',
    'version': '0.1',
    'installable': True,
    'application': False,
    'auto_install': False,
    'depends': ['base'],
    'external_dependencies': {'python': ['python-barcode', 'python-barcode[images]']},
    'license': 'OPL-1',
    'support': 'support@suppliot.eu',
}

