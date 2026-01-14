/**
 * @fileoverview Transformer registry
 * @description Manages data transformations for different property types
 */

/**
 * Transformer Registry
 * @class TransformerRegistry
 */
class TransformerRegistry {
  constructor() {
    /** @private */
    this._transformers = this._buildTransformers();
    /** @private */
    this._optionsByType = this._buildOptions();
  }

  /**
   * Apply transformation to value
   * @param {*} value - Value to transform
   * @param {string} transformName - Transformation name
   * @returns {*} Transformed value
   */
  apply(value, transformName) {
    if (!value && value !== false && value !== 0) return value;

    const transformer = this._transformers[transformName];
    if (!transformer) return value;

    const stringValue = typeof value === 'string' ? value :
                        Array.isArray(value) ? value.join(', ') :
                        String(value);

    return transformer(stringValue);
  }

  /**
   * Get transformation options for property type
   * @param {string} propertyType - Property type
   * @returns {Array<{label: string, value: string}>}
   */
  getOptionsForType(propertyType) {
    return this._optionsByType[propertyType] || [{ label: 'No processing', value: 'none' }];
  }

  /**
   * Build transformer functions
   * @private
   */
  _buildTransformers() {
    return {
      none: (v) => v,
      
      // Title transformations
      remove_prefixes: (v) => v.replace(/^(Re:|Fwd:|RE:|FWD:)\s*/gi, '').trim(),
      truncate_100: (v) => v.length > 100 ? v.substring(0, 97) + '...' : v,
      
      // Text transformations
      html_to_text: (v) => {
        if (!v) return '';
        return v
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<[^>]*>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\s+/g, ' ')
          .trim();
      },
      truncate_500: (v) => v.length > 500 ? v.substring(0, 497) + '...' : v,
      extract_links: (v) => {
        const matches = v.match(/https?:\/\/[^\s\]()]+/g);
        return matches ? matches.join(', ') : '';
      },
      
      // Email transformations
      extract_email: (v) => {
        const match = v.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
        return match ? match[0] : v;
      },
      keep_full: (v) => v,
      
      // Date transformations
      parse_date: (v) => {
        const date = new Date(v);
        return isNaN(date.getTime()) ? v : date.toISOString();
      },
      
      // Number transformations
      count_items: (v) => {
        if (Array.isArray(v)) return v.length;
        return v.split(',').length;
      },
      extract_number: (v) => {
        const match = v.match(/[\d.]+/);
        return match ? parseFloat(match[0]) : 0;
      }
    };
  }

  /**
   * Build options by type
   * @private
   */
  _buildOptions() {
    return {
      title: [
        { label: 'Use as-is', value: 'none' },
        { label: "Remove 'Re:'/'Fwd:'", value: 'remove_prefixes' },
        { label: 'Truncate (100 chars)', value: 'truncate_100' }
      ],
      rich_text: [
        { label: 'HTML to plain text', value: 'html_to_text' },
        { label: 'First 500 chars', value: 'truncate_500' },
        { label: 'Extract links', value: 'extract_links' }
      ],
      email: [
        { label: 'Extract email address', value: 'extract_email' },
        { label: 'Keep full format', value: 'keep_full' }
      ],
      date: [
        { label: 'Parse date', value: 'parse_date' }
      ],
      url: [
        { label: 'Use as-is', value: 'none' }
      ],
      number: [
        { label: 'Extract number', value: 'extract_number' },
        { label: 'Count items', value: 'count_items' }
      ]
    };
  }
}