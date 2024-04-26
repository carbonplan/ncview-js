import { inferCfAxes, getVariables } from './metadata'

describe('metadata utils', () => {
  describe('inferCfAxes()', () => {
    it('detects basic axes correctly', () => {
      const metadata = {
        'variable/.zattrs': {
          _ARRAY_DIMENSIONS: ['time', 'latitude', 'longitude'],
        },
        'latitude/.zattrs': { axis: 'Y' },
        'longitude/.zattrs': { axis: 'X' },
        'time/.zattrs': { axis: 'T' },
      }
      const result = inferCfAxes({ metadata }, false)
      expect(result.variable).toEqual({
        X: 'longitude',
        Y: 'latitude',
        T: 'time',
      })
    })

    it('handles pyramid prefix', () => {
      const metadata = {
        '0/variable/.zattrs': {
          _ARRAY_DIMENSIONS: ['time', 'latitude', 'longitude'],
        },
        '0/latitude/.zattrs': { axis: 'Y' },
        '0/longitude/.zattrs': { axis: 'X' },
        '0/time/.zattrs': { axis: 'T' },
      }
      const result = inferCfAxes({ metadata }, true)
      expect(result.variable).toEqual({
        X: 'longitude',
        Y: 'latitude',
        T: 'time',
      })
    })

    it('detects time dimension with calendar attribute', () => {
      const metadata = {
        'variable/.zattrs': {
          _ARRAY_DIMENSIONS: ['time', 'latitude', 'longitude'],
        },
        'time/.zattrs': { calendar: 'gregorian' },
        'latitude/.zattrs': { axis: 'Y' },
        'longitude/.zattrs': { axis: 'X' },
      }
      const result = inferCfAxes({ metadata }, false)
      expect(result.variable.T).toBe('time')
    })

    it('returns an empty object by default', () => {
      expect(
        inferCfAxes({
          metadata: {
            '.zattrs': { top_level_attribute: 'top_level_attribute' },
            '.zgroup': { zarr_format: 2 },
            'adt/.zarray': { array_info: 'array_info' },
            'adt/.zattrs': {
              _ARRAY_DIMENSIONS: ['adt'],
            },
          },
          zarr_consolidated_format: 1,
        })
      ).toEqual({})
      expect(
        inferCfAxes({
          metadata: {
            '.zattrs': { top_level_attribute: 'top_level_attribute' },
            '.zgroup': { zarr_format: 2 },
            'adt/.zarray': { array_info: 'array_info' },
            'adt/.zattrs': {
              _ARRAY_DIMENSIONS: ['no', 'spatial', 'dims'],
            },
            'no/.zarray': { array_info: 'array_info' },
            'no/.zattrs': { _ARRAY_DIMENSIONS: ['no'] },
            'spatial/.zarray': { array_info: 'array_info' },
            'spatial/.zattrs': {
              _ARRAY_DIMENSIONS: ['spatial'],
            },
            'dims/.zarray': { array_info: 'array_info' },
            'dims/.zattrs': { _ARRAY_DIMENSIONS: ['dims'] },
          },
          zarr_consolidated_format: 1,
        })
      ).toEqual({})
    })

    describe('hardcoded fallbacks', () => {
      ;[
        ['latitude', 'longitude'],
        ['y', 'x'],
        ['lat', 'lon'],
        ['nlat', 'nlon'],
        ['rlat', 'rlon'],
      ].forEach(([y, x]) => {
        it(`detects ${y}, ${x} as spatial axes`, () => {
          expect(
            inferCfAxes({
              metadata: {
                '.zattrs': { top_level_attribute: 'top_level_attribute' },
                '.zgroup': { zarr_format: 2 },
                'adt/.zarray': { array_info: 'array_info' },
                'adt/.zattrs': {
                  _ARRAY_DIMENSIONS: [y, x],
                },
                [`${y}/.zarray`]: { array_info: 'array_info' },
                [`${y}/.zattrs`]: { _ARRAY_DIMENSIONS: [y] },
                [`${x}/.zarray`]: { array_info: 'array_info' },
                [`${x}/.zattrs`]: {
                  _ARRAY_DIMENSIONS: [x],
                },
              },
              zarr_consolidated_format: 1,
            })
          ).toEqual({ adt: { X: x, Y: y } })
        })
      })
    })

    describe('pyramids', () => {
      it('handles CF-style axes', () => {
        expect(
          inferCfAxes(
            {
              metadata: {
                '.zattrs': { top_level_attribute: 'top_level_attribute' },
                '.zgroup': { zarr_format: 2 },
                '0/adt/.zarray': { array_info: 'array_info' },
                '0/adt/.zattrs': {
                  _ARRAY_DIMENSIONS: ['time', 'latitude', 'longitude'],
                },
                '0/latitude/.zarray': { array_info: 'array_info' },
                '0/latitude/.zattrs': {
                  _ARRAY_DIMENSIONS: ['latitude'],
                  axis: 'Y',
                },
                '0/longitude/.zarray': { array_info: 'array_info' },
                '0/longitude/.zattrs': {
                  _ARRAY_DIMENSIONS: ['longitude'],
                  axis: 'X',
                },
                '0/time/.zarray': { array_info: 'array_info' },
                '0/time/.zattrs': { _ARRAY_DIMENSIONS: ['time'], axis: 'T' },
                '1/adt/.zarray': { array_info: 'array_info' },
                '1/adt/.zattrs': {
                  _ARRAY_DIMENSIONS: ['time', 'latitude', 'longitude'],
                },
                '1/latitude/.zarray': { array_info: 'array_info' },
                '1/latitude/.zattrs': {
                  _ARRAY_DIMENSIONS: ['latitude'],
                  axis: 'Y',
                },
                '1/longitude/.zarray': { array_info: 'array_info' },
                '1/longitude/.zattrs': {
                  _ARRAY_DIMENSIONS: ['longitude'],
                  axis: 'X',
                },
                '1/time/.zarray': { array_info: 'array_info' },
                '1/time/.zattrs': { _ARRAY_DIMENSIONS: ['time'], axis: 'T' },
              },
              zarr_consolidated_format: 1,
            },
            true
          )
        ).toEqual({ adt: { T: 'time', X: 'longitude', Y: 'latitude' } })
      })

      describe('hardcoded fallbacks', () => {
        ;[
          ['latitude', 'longitude'],
          ['y', 'x'],
          ['lat', 'lon'],
          ['nlat', 'nlon'],
        ].forEach(([y, x]) => {
          it(`detects ${y}, ${x} as spatial axes`, () => {
            expect(
              inferCfAxes(
                {
                  metadata: {
                    '.zattrs': { top_level_attribute: 'top_level_attribute' },
                    '.zgroup': { zarr_format: 2 },
                    '0/adt/.zarray': { array_info: 'array_info' },
                    '0/adt/.zattrs': {
                      _ARRAY_DIMENSIONS: [y, x],
                    },
                    '0/y/.zarray': { array_info: 'array_info' },
                    '0/y/.zattrs': {
                      _ARRAY_DIMENSIONS: [y],
                    },
                    '0/x/.zarray': { array_info: 'array_info' },
                    '0/x/.zattrs': {
                      _ARRAY_DIMENSIONS: [x],
                    },
                    '1/adt/.zarray': { array_info: 'array_info' },
                    '1/adt/.zattrs': {
                      _ARRAY_DIMENSIONS: [y, x],
                    },
                    '1/y/.zarray': { array_info: 'array_info' },
                    '1/y/.zattrs': {
                      _ARRAY_DIMENSIONS: [y],
                    },
                    '1/x/.zarray': { array_info: 'array_info' },
                    '1/x/.zattrs': {
                      _ARRAY_DIMENSIONS: [x],
                    },
                  },
                  zarr_consolidated_format: 1,
                },
                true
              )
            ).toEqual({ adt: { X: x, Y: y } })
          })
        })

        it('does not detect rotated coords (rlat, rlon) as spatial axes', () => {
          expect(
            inferCfAxes(
              {
                metadata: {
                  '.zattrs': { top_level_attribute: 'top_level_attribute' },
                  '.zgroup': { zarr_format: 2 },
                  '0/adt/.zarray': { array_info: 'array_info' },
                  '0/adt/.zattrs': {
                    _ARRAY_DIMENSIONS: ['rlat', 'rlon'],
                  },
                  '0/y/.zarray': { array_info: 'array_info' },
                  '0/y/.zattrs': {
                    _ARRAY_DIMENSIONS: ['rlat'],
                  },
                  '0/x/.zarray': { array_info: 'array_info' },
                  '0/x/.zattrs': {
                    _ARRAY_DIMENSIONS: ['rlon'],
                  },
                  '1/adt/.zarray': { array_info: 'array_info' },
                  '1/adt/.zattrs': {
                    _ARRAY_DIMENSIONS: ['rlat', 'rlon'],
                  },
                  '1/y/.zarray': { array_info: 'array_info' },
                  '1/y/.zattrs': {
                    _ARRAY_DIMENSIONS: ['rlat'],
                  },
                  '1/x/.zarray': { array_info: 'array_info' },
                  '1/x/.zattrs': {
                    _ARRAY_DIMENSIONS: ['rlon'],
                  },
                },
                zarr_consolidated_format: 1,
              },
              true
            )
          ).toEqual({})
        })
      })
    })
  })

  describe('getVariables()', () => {
    it('throws an error when all variables are <2D', () => {
      expect(() =>
        getVariables(
          {
            metadata: {
              '.zattrs': { top_level_attribute: 'top_level_attribute' },
              '.zgroup': { zarr_format: 2 },
              'variable/.zarray': { shape: [365] },
              'variable/.zattrs': { _ARRAY_DIMENSIONS: ['time'] },
              'time/.zarray': { shape: [365] },
              'time/.zattrs': { _ARRAY_DIMENSIONS: ['time'] },
            },
            zarr_consolidated_format: 1,
          },
          {},
          false
        )
      ).toThrow('Please provide a dataset with at least 2D data arrays.')
    })

    it('throws an error when coordinate arrays are missing for variables', () => {
      expect(() =>
        getVariables(
          {
            metadata: {
              '.zattrs': { top_level_attribute: 'top_level_attribute' },
              '.zgroup': { zarr_format: 2 },
              'variable/.zarray': { shape: [365, 128, 128] },
              'variable/.zattrs': { _ARRAY_DIMENSIONS: ['time', 'x', 'y'] },
              'time/.zarray': { shape: [365] },
              'time/.zattrs': { _ARRAY_DIMENSIONS: ['time'] },
            },
            zarr_consolidated_format: 1,
          },
          {},
          false
        )
      ).toThrow(
        'No viewable variables found. Missing coordinate information for dimensions: x, y.'
      )
    })

    it('throws an error when variables do not have cfAxes information', () => {
      expect(() =>
        getVariables(
          {
            metadata: {
              '.zattrs': { top_level_attribute: 'top_level_attribute' },
              '.zgroup': { zarr_format: 2 },
              'variable/.zarray': { shape: [365, 128, 128] },
              'variable/.zattrs': { _ARRAY_DIMENSIONS: ['time', 'x', 'y'] },
              'time/.zarray': { shape: [365] },
              'time/.zattrs': { _ARRAY_DIMENSIONS: ['time'] },
              'x/.zarray': { shape: [128] },
              'x/.zattrs': { _ARRAY_DIMENSIONS: ['x'] },
              'y/.zarray': { shape: [128] },
              'y/.zattrs': { _ARRAY_DIMENSIONS: ['y'] },
            },
            zarr_consolidated_format: 1,
          },
          {},
          false
        )
      ).toThrow(
        'No viewable variables found. Unable to infer spatial dimensions for variable: variable (time, x, y).'
      )
    })

    it('returns array of valid variables', () => {
      expect(
        getVariables(
          {
            metadata: {
              '.zattrs': { top_level_attribute: 'top_level_attribute' },
              '.zgroup': { zarr_format: 2 },
              'variable/.zarray': { shape: [365, 128, 128] },
              'variable/.zattrs': { _ARRAY_DIMENSIONS: ['time', 'x', 'y'] },
              'time/.zarray': { shape: [365] },
              'time/.zattrs': { _ARRAY_DIMENSIONS: ['time'] },
              'x/.zarray': { shape: [128] },
              'x/.zattrs': { _ARRAY_DIMENSIONS: ['x'] },
              'y/.zarray': { shape: [128] },
              'y/.zattrs': { _ARRAY_DIMENSIONS: ['y'] },
            },
            zarr_consolidated_format: 1,
          },
          { variable: { T: 'time', X: 'x', Y: 'y' } },
          false
        )
      ).toEqual({ levels: [], variables: ['variable'] })
    })

    it('handles multiple valid variables', () => {
      expect(
        getVariables(
          {
            metadata: {
              '.zattrs': { top_level_attribute: 'top_level_attribute' },
              '.zgroup': { zarr_format: 2 },
              'variable_one/.zarray': { shape: [365, 128, 128] },
              'variable_one/.zattrs': { _ARRAY_DIMENSIONS: ['time', 'x', 'y'] },
              'variable_two/.zarray': { shape: [365, 128, 128] },
              'variable_two/.zattrs': { _ARRAY_DIMENSIONS: ['time', 'x', 'y'] },
              'time/.zarray': { shape: [365] },
              'time/.zattrs': { _ARRAY_DIMENSIONS: ['time'] },
              'x/.zarray': { shape: [128] },
              'x/.zattrs': { _ARRAY_DIMENSIONS: ['x'] },
              'y/.zarray': { shape: [128] },
              'y/.zattrs': { _ARRAY_DIMENSIONS: ['y'] },
            },
            zarr_consolidated_format: 1,
          },
          {
            variable_one: { T: 'time', X: 'x', Y: 'y' },
            variable_two: { T: 'time', X: 'x', Y: 'y' },
          },
          false
        )
      ).toEqual({ levels: [], variables: ['variable_one', 'variable_two'] })
    })

    describe('filtering', () => {
      it('filters variables <2D', () => {
        expect(
          getVariables(
            {
              metadata: {
                '.zattrs': { top_level_attribute: 'top_level_attribute' },
                '.zgroup': { zarr_format: 2 },
                'variable_one/.zarray': { shape: [365, 128, 128] },
                'variable_one/.zattrs': {
                  _ARRAY_DIMENSIONS: ['time', 'x', 'y'],
                },
                'variable_two/.zarray': { shape: [365] },
                'variable_two/.zattrs': {
                  _ARRAY_DIMENSIONS: ['time'],
                },
                'time/.zarray': { shape: [365] },
                'time/.zattrs': { _ARRAY_DIMENSIONS: ['time'] },
                'x/.zarray': { shape: [128] },
                'x/.zattrs': { _ARRAY_DIMENSIONS: ['x'] },
                'y/.zarray': { shape: [128] },
                'y/.zattrs': { _ARRAY_DIMENSIONS: ['y'] },
              },
              zarr_consolidated_format: 1,
            },
            {
              variable_one: { T: 'time', X: 'x', Y: 'y' },
              variable_two: { T: 'time', X: 'x', Y: 'y' },
            },
            false
          )
        ).toEqual({ levels: [], variables: ['variable_one'] })
      })

      it('filters variables missing coordinate arrays', () => {
        expect(
          getVariables(
            {
              metadata: {
                '.zattrs': { top_level_attribute: 'top_level_attribute' },
                '.zgroup': { zarr_format: 2 },
                'variable_one/.zarray': { shape: [365, 128, 128] },
                'variable_one/.zattrs': {
                  _ARRAY_DIMENSIONS: ['time', 'x', 'y'],
                },
                'variable_two/.zarray': { shape: [365, 128, 128] },
                'variable_two/.zattrs': {
                  _ARRAY_DIMENSIONS: ['missing_coord', 'x', 'y'],
                },
                'time/.zarray': { shape: [365] },
                'time/.zattrs': { _ARRAY_DIMENSIONS: ['time'] },
                'x/.zarray': { shape: [128] },
                'x/.zattrs': { _ARRAY_DIMENSIONS: ['x'] },
                'y/.zarray': { shape: [128] },
                'y/.zattrs': { _ARRAY_DIMENSIONS: ['y'] },
              },
              zarr_consolidated_format: 1,
            },
            {
              variable_one: { T: 'time', X: 'x', Y: 'y' },
              variable_two: { T: 'time', X: 'x', Y: 'y' },
            },
            false
          )
        ).toEqual({ levels: [], variables: ['variable_one'] })
      })

      it('filters variables missing cfAxes information', () => {
        expect(
          getVariables(
            {
              metadata: {
                '.zattrs': { top_level_attribute: 'top_level_attribute' },
                '.zgroup': { zarr_format: 2 },
                'variable_one/.zarray': { shape: [365, 128, 128] },
                'variable_one/.zattrs': {
                  _ARRAY_DIMENSIONS: ['time', 'x', 'y'],
                },
                'variable_two/.zarray': { shape: [365, 128, 128] },
                'variable_two/.zattrs': {
                  _ARRAY_DIMENSIONS: ['time', 'x', 'y'],
                },
                'time/.zarray': { shape: [365] },
                'time/.zattrs': { _ARRAY_DIMENSIONS: ['time'] },
                'x/.zarray': { shape: [128] },
                'x/.zattrs': { _ARRAY_DIMENSIONS: ['x'] },
                'y/.zarray': { shape: [128] },
                'y/.zattrs': { _ARRAY_DIMENSIONS: ['y'] },
              },
              zarr_consolidated_format: 1,
            },
            {
              variable_one: { T: 'time', X: 'x', Y: 'y' },
            },
            false
          )
        ).toEqual({ levels: [], variables: ['variable_one'] })
      })
    })

    describe('pyramids', () => {
      it('returns levels of pyramid', () => {
        expect(
          getVariables(
            {
              metadata: {
                '.zattrs': { top_level_attribute: 'top_level_attribute' },
                '.zgroup': { zarr_format: 2 },
                '0/variable/.zarray': { shape: [365, 128, 128] },
                '0/variable/.zattrs': { _ARRAY_DIMENSIONS: ['time', 'x', 'y'] },
                '0/time/.zarray': { shape: [365] },
                '0/time/.zattrs': { _ARRAY_DIMENSIONS: ['time'] },
                '0/x/.zarray': { shape: [128] },
                '0/x/.zattrs': { _ARRAY_DIMENSIONS: ['x'] },
                '0/y/.zarray': { shape: [128] },
                '0/y/.zattrs': { _ARRAY_DIMENSIONS: ['y'] },
              },
              zarr_consolidated_format: 1,
            },
            { variable: { T: 'time', X: 'x', Y: 'y' } },
            true
          )
        ).toEqual({ levels: ['0'], variables: ['variable'] })
        expect(
          getVariables(
            {
              metadata: {
                '.zattrs': { top_level_attribute: 'top_level_attribute' },
                '.zgroup': { zarr_format: 2 },
                '0/variable/.zarray': { shape: [365, 128, 128] },
                '0/variable/.zattrs': { _ARRAY_DIMENSIONS: ['time', 'x', 'y'] },
                '0/time/.zarray': { shape: [365] },
                '0/time/.zattrs': { _ARRAY_DIMENSIONS: ['time'] },
                '0/x/.zarray': { shape: [128] },
                '0/x/.zattrs': { _ARRAY_DIMENSIONS: ['x'] },
                '0/y/.zarray': { shape: [128] },
                '0/y/.zattrs': { _ARRAY_DIMENSIONS: ['y'] },
                '1/variable/.zarray': { shape: [365, 128, 128] },
                '1/variable/.zattrs': { _ARRAY_DIMENSIONS: ['time', 'x', 'y'] },
                '1/time/.zarray': { shape: [365] },
                '1/time/.zattrs': { _ARRAY_DIMENSIONS: ['time'] },
                '1/x/.zarray': { shape: [128] },
                '1/x/.zattrs': { _ARRAY_DIMENSIONS: ['x'] },
                '1/y/.zarray': { shape: [128] },
                '1/y/.zattrs': { _ARRAY_DIMENSIONS: ['y'] },
              },
              zarr_consolidated_format: 1,
            },
            { variable: { T: 'time', X: 'x', Y: 'y' } },
            true
          )
        ).toEqual({ levels: ['0', '1'], variables: ['variable'] })
      })

      it('throws an error when all variables are <2D', () => {
        expect(() =>
          getVariables(
            {
              metadata: {
                '.zattrs': { top_level_attribute: 'top_level_attribute' },
                '.zgroup': { zarr_format: 2 },
                '0/variable/.zarray': { shape: [365] },
                '0/variable/.zattrs': { _ARRAY_DIMENSIONS: ['time'] },
                '0/time/.zarray': { shape: [365] },
                '0/time/.zattrs': { _ARRAY_DIMENSIONS: ['time'] },
              },
              zarr_consolidated_format: 1,
            },
            {},
            true
          )
        ).toThrow('Please provide a dataset with at least 2D data arrays.')
      })

      it('throws an error when coordinate arrays are missing for variables', () => {
        expect(() =>
          getVariables(
            {
              metadata: {
                '.zattrs': { top_level_attribute: 'top_level_attribute' },
                '.zgroup': { zarr_format: 2 },
                '0/variable/.zarray': { shape: [365, 128, 128] },
                '0/variable/.zattrs': { _ARRAY_DIMENSIONS: ['time', 'x', 'y'] },
                '0/time/.zarray': { shape: [365] },
                '0/time/.zattrs': { _ARRAY_DIMENSIONS: ['time'] },
              },
              zarr_consolidated_format: 1,
            },
            {},
            true
          )
        ).toThrow(
          'No viewable variables found. Missing coordinate information for dimensions: x, y.'
        )
      })

      it('throws an error when variables do not have cfAxes information', () => {
        expect(() =>
          getVariables(
            {
              metadata: {
                '.zattrs': { top_level_attribute: 'top_level_attribute' },
                '.zgroup': { zarr_format: 2 },
                '0/variable/.zarray': { shape: [365, 128, 128] },
                '0/variable/.zattrs': { _ARRAY_DIMENSIONS: ['time', 'x', 'y'] },
                '0/time/.zarray': { shape: [365] },
                '0/time/.zattrs': { _ARRAY_DIMENSIONS: ['time'] },
                '0/x/.zarray': { shape: [128] },
                '0/x/.zattrs': { _ARRAY_DIMENSIONS: ['x'] },
                '0/y/.zarray': { shape: [128] },
                '0/y/.zattrs': { _ARRAY_DIMENSIONS: ['y'] },
              },
              zarr_consolidated_format: 1,
            },
            {},
            true
          )
        ).toThrow(
          'No viewable variables found. Unable to infer spatial dimensions for variable: variable (time, x, y).'
        )
      })
    })
  })
})
