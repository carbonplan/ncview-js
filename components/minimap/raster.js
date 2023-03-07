import React, { useState, useEffect, useRef } from 'react'
import { useRegl } from './regl'
import { useMinimap } from './minimap'

const validateGroup = (data, variable) => {
  if (!Object.keys(data).includes(variable)) {
    throw new Error(
      `variable ${variable} not found in zarr dataset, options are: ${Object.keys(
        data
      )}`
    )
  }

  return true
}

const getBounds = ({ data, lat, lon }) => {
  return {
    lat: [
      data[lat].data.reduce((a, b) => Math.min(a, b)),
      data[lat].data.reduce((a, b) => Math.max(a, b)),
    ],
    lon: [
      data[lon].data.reduce((a, b) => Math.min(a, b)),
      data[lon].data.reduce((a, b) => Math.max(a, b)),
    ],
  }
}

const NORTH_POLE = [0, 90]

const Raster = ({
  source,
  variable,
  mode = 'rgb',
  colormap = null,
  clim = null,
  transpose,
  northPole = NORTH_POLE,
  nullValue = -999,
  bounds = null,
  lat = 'lat',
  lon = 'lon',
}) => {
  const { viewport, regl } = useRegl()
  const { scale, translate, projection } = useMinimap()

  if (mode == 'lut' && !colormap) {
    throw new Error("must provide 'colormap' when using 'lut' mode")
  }

  if (mode == 'lut' && !clim) {
    throw new Error("must provide 'clim' when using 'lut' mode")
  }

  const redraw = useRef()
  const draw = useRef()
  const texture = useRef()
  const lut = useRef()
  const context = useRef({})
  const isLoaded = useRef(false)
  const boundsRef = useRef(null)
  const zarrGroupCache = useRef()
  const invalidated = useRef(null)

  useEffect(() => {
    regl.frame((_context) => {
      context.current = _context

      if (invalidated.current) {
        regl.clear({
          color: [0, 0, 0, 0],
          depth: 1,
        })

        redraw.current(invalidated.current)
      }
      invalidated.current = null
    })
  }, [])

  useEffect(() => {
    texture.current ||= regl.texture({
      width: 1,
      height: 1,
      data: [0, 0, 0, 0],
    })

    lut.current ||= regl.texture()

    const position = [
      0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0,
    ]

    let uniforms = {
      pixelRatio: regl.prop('pixelRatio'),
      viewportWidth: regl.prop('viewportWidth'),
      viewportHeight: regl.prop('viewportHeight'),
      texture: regl.prop('texture'),
      scale: regl.prop('scale'),
      translate: regl.prop('translate'),
      northPole: regl.prop('northPole'),
      transpose: regl.prop('transpose'),
      nullValue: regl.prop('nullValue'),
      bounds: regl.prop('bounds'),
    }

    if (mode === 'lut') {
      uniforms = {
        ...uniforms,
        lut: regl.prop('lut'),
        clim: regl.prop('clim'),
      }
    }

    draw.current = regl({
      vert: `
      #ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
      #else
      precision mediump float;
      #endif
      attribute vec2 position;
      varying vec2 uv;
      void main() {
        uv = vec2(position.y, position.x);
        gl_Position = vec4(2.0 * position.x - 1.0, 2.0 * position.y - 1.0, 0.0, 1.0);
      }
      `,

      frag: `
      #ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
      #else
      precision mediump float;
      #endif
      varying vec2 uv;
      uniform vec2 clim;
      uniform vec4 bounds;
      uniform float viewportWidth;
      uniform float viewportHeight;
      uniform sampler2D texture;
      uniform float pixelRatio;
      uniform float scale;
      uniform vec2 translate;
      uniform vec2 northPole;
      uniform bool transpose;
      uniform float nullValue;
      ${mode === 'lut' ? 'uniform sampler2D lut;' : ''}
      ${mode === 'lut' ? 'uniform vec3 nullColor;' : ''}

      const float pi = 3.14159265358979323846264;
      const float halfPi = pi * 0.5;
      const float twoPi = pi * 2.0;

      bool isnan(float val)
      {
        return ( val < 0.0 || 0.0 < val || val == 0.0 ) ? false : true;
      }

      vec2 rotateCoords(vec2 coords, vec2 northPole) {
        // Calculate rotation based of north pole coordinates of rotated grid
        float phiOffset = northPole.y == 90.0 ? 0.0 : 180.0;
        float phi = radians(phiOffset + northPole.x);
        float theta = radians(-1.0 * (90.0 - northPole.y));

        float lon = radians(coords.x);
        float lat = radians(coords.y);

        // Convert from spherical to cartesian coordinates
        vec3 unrotatedCoord = vec3(cos(lon) * cos(lat), sin(lon) * cos(lat), sin(lat));

        // From https://en.wikipedia.org/wiki/Rotation_matrix#General_rotations
        mat3 intrinsicRotation = mat3(
          cos(phi) * cos(theta), -1.0 * sin(phi), cos(phi) * sin(theta),
          sin(phi) * cos(theta), cos(phi)       , sin(phi) * sin(theta),
          -1.0 * sin(theta)    , 0              , cos(theta)
        );

        vec3 rotatedCoord = intrinsicRotation * unrotatedCoord;

        // Convert from cartesian to spherical coordinates
        float rotatedLon = degrees(atan(rotatedCoord.y, rotatedCoord.x));
        float rotatedLat = degrees(asin(rotatedCoord.z));

        return vec2(rotatedLon, rotatedLat);
      }

      ${projection.glsl.func}
      void main() {
        
        float width = viewportWidth / pixelRatio;
        float height = viewportHeight / pixelRatio;
        float x = gl_FragCoord.x / pixelRatio;
        float y = gl_FragCoord.y / pixelRatio;

        vec2 delta = vec2((1.0 + translate.x) * width / 2.0, (1.0 - translate.y) * height / 2.0);        

        x = (x - delta.x) / (scale * (width / (pi * 2.0)));
        ${
          transpose
            ? `y = (delta.y - y) / (scale * (width / (pi * 2.0)));`
            : `y = (y - delta.y) / (scale * (width / (pi * 2.0)));`
        }

        vec2 lookup = ${projection.glsl.name}(x, y);
        vec2 rotated = rotateCoords(lookup, northPole);

        // Handle points that wrap
        float offsetX = 0.0;
        if (rotated.x < bounds[2]) {
          offsetX = 360.0;
        } else if (rotated.x > bounds[3]) {
          offsetX = -360.0;
        }

        float scaleY = 180.0 / abs(bounds[0] - bounds[1]);
        float scaleX = 360.0 / abs(bounds[2] - bounds[3]);
        float translateY = 90.0 + bounds[0];
        float translateX = 180.0 + bounds[2];

        float rescaledY = scaleY * (radians(rotated.y - translateY) + halfPi) / pi;
        float rescaledX = scaleX * (radians(rotated.x + offsetX - translateX) + pi) / twoPi;

        vec2 coord;
        ${
          transpose
            ? `coord = vec2(rescaledX, rescaledY);`
            : `coord = vec2(rescaledY, rescaledX);`
        }

        vec4 value = texture2D(texture, coord);

        bool inboundsY = rotated.y > bounds[0] && rotated.y < bounds[1];
        bool inboundsX = rotated.x + offsetX > bounds[2] && rotated.x + offsetX < bounds[3];

        ${
          mode === 'lut'
            ? `
          vec4 c;
          if ((!inboundsY || !inboundsX) || (value.x == nullValue || isnan(value.x))) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
          } else {
            float rescaled = (value.x - clim.x)/(clim.y - clim.x);
            c = texture2D(lut, vec2(rescaled, 1.0));
            gl_FragColor = vec4(c.x, c.y, c.z, 1.0);
          }`
            : ''
        }

        ${
          mode === 'rgb'
            ? `
          if (value.x == nullValue) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
          } else {
            gl_FragColor = vec4(value.x , value.y, value.z, 1.0);
          }
        `
            : ''
        }
      }
      `,

      attributes: {
        position: position,
      },

      uniforms: uniforms,

      count: 6,

      primitive: 'triangles',
    })
  }, [projection.glsl.name])

  redraw.current = (invalidatedBy) => {
    if (draw.current && isLoaded.current) {
      const { pixelRatio } = context.current
      draw.current({
        texture: texture.current,
        lut: lut.current,
        bounds: boundsRef.current
          ? [
              boundsRef.current.lat[0],
              boundsRef.current.lat[1],
              boundsRef.current.lon[0],
              boundsRef.current.lon[1],
            ]
          : [-90, 90, -180, 180],
        scale,
        translate,
        northPole,
        clim,
        nullValue,
        viewportWidth: viewport.width * pixelRatio,
        viewportHeight: viewport.height * pixelRatio,
        pixelRatio,
      })
    }
  }

  useEffect(() => {
    // handle loading synchronously from pre-fetched zarr data
    if (variable) {
      validateGroup(source, variable)

      if (!bounds && source[lat] && source[lon]) {
        boundsRef.current = getBounds({ data: source, lat, lon })
      }

      zarrGroupCache.current = source
      isLoaded.current = true
      texture.current(zarrGroupCache.current[variable])
      invalidated.current = 'on zarr group read'
    } else {
      isLoaded.current = true
      texture.current(source)
      invalidated.current = 'on zarr array read'
    }
  }, [source, lat, lon])

  useEffect(() => {
    // handle variable change on cached zarr group data
    if (zarrGroupCache.current) {
      texture.current(zarrGroupCache.current[variable])
      invalidated.current = 'on variable change'
    }
  }, [variable])

  useEffect(() => {
    if (bounds) {
      boundsRef.current = bounds
    }
    invalidated.current = 'on bounds change'
  }, [
    bounds && bounds.lat[0],
    bounds && bounds.lat[1],
    bounds && bounds.lon[0],
    bounds && bounds.lon[1],
  ])

  useEffect(() => {
    if (colormap) {
      lut.current({
        data: colormap,
        format: 'rgb',
        shape: [colormap.length, 1],
      })
      invalidated.current = 'on colormap change'
    }
  }, [colormap])

  useEffect(() => {
    invalidated.current = 'on viewport change'
  }, [viewport])

  useEffect(() => {
    invalidated.current = 'on prop change'
  }, [
    clim && clim[0],
    clim && clim[1],
    mode,
    scale,
    translate[0],
    translate[1],
    northPole?.at(0),
    northPole?.at(1),
    nullValue,
    projection,
  ])

  return null
}

export default Raster
