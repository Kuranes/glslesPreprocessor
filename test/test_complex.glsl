#version 100
#extension GL_EXT_shader_texture_lod : require
#extension GL_OES_standard_derivatives : enable
#ifdef GL_FRAGMENT_PRECISION_HIGH
 precision highp float;
 #else
 precision mediump float;
#endif
#define CUBEMAP
#define SHADER_NAME PBR(short_mat_viewport)
#define TEXTURE_BRDF
#define _ATLAS_SHADOW
#define _JITTER_OFFSET
#define _PCFx1


uniform float uAlbedoPBRFactor;
uniform float uEnvironmentExposure;
uniform float uGlossinessPBRFactor;
uniform float uMetalnessPBRFactor;
uniform float uRGBMRange;
uniform float uShadowReceive0_bias;
uniform float uShadowReceive1_bias;
uniform float uShadowReceive3_bias;
uniform float uSketchfabLight0_spotBlend;
uniform float uSketchfabLight0_spotCutOff;
uniform float uSketchfabLight1_spotBlend;
uniform float uSketchfabLight1_spotCutOff;
uniform float uSpecularF0Factor;
uniform float uStaticFrameNumShadow0;
uniform float uStaticFrameNumShadow1;
uniform float uStaticFrameNumShadow3;
uniform int uOutputLinear;
uniform mat4 uEnvironmentTransform;
uniform mat4 uShadow_Texture0_projectionMatrix;
uniform mat4 uShadow_Texture0_viewMatrix;
uniform mat4 uShadow_Texture1_projectionMatrix;
uniform mat4 uShadow_Texture1_viewMatrix;
uniform mat4 uShadow_Texture3_projectionMatrix;
uniform mat4 uShadow_Texture3_viewMatrix;
uniform sampler2D Texture0;
uniform sampler2D Texture7;
uniform sampler2D sIntegrateBRDF;
uniform samplerCube sSpecularPBR;
uniform vec2 uTextureEnvironmentSpecularPBRLodRange;
uniform vec2 uTextureEnvironmentSpecularPBRTextureSize;
uniform vec3 uDiffuseSPH[9];
uniform vec3 uSketchfabLight0_viewDirection;
uniform vec3 uSketchfabLight1_viewDirection;
uniform vec3 uSketchfabLight3_viewDirection;
uniform vec4 uShadow_Texture0_depthRange;
uniform vec4 uShadow_Texture0_mapSize;
uniform vec4 uShadow_Texture0_renderSize;
uniform vec4 uShadow_Texture1_depthRange;
uniform vec4 uShadow_Texture1_mapSize;
uniform vec4 uShadow_Texture3_depthRange;
uniform vec4 uShadow_Texture3_mapSize;
uniform vec4 uSketchfabLight0_attenuation;
uniform vec4 uSketchfabLight0_diffuse;
uniform vec4 uSketchfabLight0_viewPosition;
uniform vec4 uSketchfabLight1_attenuation;
uniform vec4 uSketchfabLight1_diffuse;
uniform vec4 uSketchfabLight1_viewPosition;
uniform vec4 uSketchfabLight3_diffuse;

varying vec2 vTexCoord6;
varying vec3 vModelNormal;
varying vec3 vModelVertex;
varying vec3 vViewNormal;
varying vec4 vViewVertex;



  uniform struct earf {
    int x;
  } america;



  struct ref {
    earf a;
    earf b[2];  
  };

  uniform earf asia, panam[2];
  uniform ref xxx, yyy[2];


// approximation such as http://chilliant.blogspot.fr/2012/08/srgb-approximations-for-hlsl.html
// introduced slightly darker colors and more slight banding in the darks.

// so we stick with the reference implementation (except we don't check if color >= 0.0):
// https://www.khronos.org/registry/gles/extensions/EXT/EXT_sRGB.txt
#define LIN_SRGB(x) x < 0.0031308 ? x * 12.92 : 1.055 * pow(x, 1.0/2.4) - 0.055
#define SRGB_LIN(x) x < 0.04045 ? x * (1.0 / 12.92) : pow((x + 0.055) * (1.0 / 1.055), 2.4)

//#pragma DECLARE_FUNCTION
float linearTosRGB(const in float color) { return LIN_SRGB(color); }

//#pragma DECLARE_FUNCTION
vec3 linearTosRGB(const in vec3 color) { return vec3(LIN_SRGB(color.r), LIN_SRGB(color.g), LIN_SRGB(color.b)); }

//#pragma DECLARE_FUNCTION
vec4 linearTosRGB(const in vec4 color) { return vec4(LIN_SRGB(color.r), LIN_SRGB(color.g), LIN_SRGB(color.b), color.a); }

//#pragma DECLARE_FUNCTION NODE_NAME:sRGBToLinear
float sRGBToLinear(const in float color) { return SRGB_LIN(color); }

//#pragma DECLARE_FUNCTION NODE_NAME:sRGBToLinear
vec3 sRGBToLinear(const in vec3 color) { return vec3(SRGB_LIN(color.r), SRGB_LIN(color.g), SRGB_LIN(color.b)); }

//#pragma DECLARE_FUNCTION NODE_NAME:sRGBToLinear
vec4 sRGBToLinear(const in vec4 color) { return vec4(SRGB_LIN(color.r), SRGB_LIN(color.g), SRGB_LIN(color.b), color.a); }

//http://graphicrants.blogspot.fr/2009/04/rgbm-color-encoding.html
vec3 RGBMToRGB( const in vec4 rgba ) {
    const float maxRange = 8.0;
    return rgba.rgb * maxRange * rgba.a;
}

const mat3 LUVInverse = mat3( 6.0013, -2.700, -1.7995, -1.332, 3.1029, -5.7720, 0.3007, -1.088, 5.6268 );

vec3 LUVToRGB( const in vec4 vLogLuv ) {
    float Le = vLogLuv.z * 255.0 + vLogLuv.w;
    vec3 Xp_Y_XYZp;
    Xp_Y_XYZp.y = exp2((Le - 127.0) / 2.0);
    Xp_Y_XYZp.z = Xp_Y_XYZp.y / vLogLuv.y;
    Xp_Y_XYZp.x = vLogLuv.x * Xp_Y_XYZp.z;
    vec3 vRGB = LUVInverse * Xp_Y_XYZp;
    return max(vRGB, 0.0);
}

// http://graphicrants.blogspot.fr/2009/04/rgbm-color-encoding.html
//#pragma DECLARE_FUNCTION
vec4 encodeRGBM(const in vec3 color, const in float range) {
    if(range <= 0.0) return vec4(color, 1.0);
    vec4 rgbm;
    vec3 col = color / range;
    rgbm.a = clamp( max( max( col.r, col.g ), max( col.b, 1e-6 ) ), 0.0, 1.0 );
    rgbm.a = ceil( rgbm.a * 255.0 ) / 255.0;
    rgbm.rgb = col / rgbm.a;
    return rgbm;
}

//#pragma DECLARE_FUNCTION
vec3 decodeRGBM(const in vec4 color, const in float range) {
    if(range <= 0.0) return color.rgb;
    return range * color.rgb * color.a;
}

// https://twitter.com/pyalot/status/711956736639418369
// https://github.com/mrdoob/three.js/issues/10331
//#pragma DECLARE_FUNCTION NODE_NAME:FrontNormal
#define _frontNormal(normal) gl_FrontFacing ? normal : -normal

//#pragma DECLARE_FUNCTION NODE_NAME:Normalize
#define _normalize(vec) normalize(vec)

//#pragma DECLARE_FUNCTION
vec4 preMultAlpha(const in vec3 color, const in float alpha) { return vec4(color.rgb * alpha, alpha); }

//#pragma DECLARE_FUNCTION
vec4 preMultAlpha(const in vec4 color) { return vec4(color.rgb * color.a, color.a); }

//#pragma DECLARE_FUNCTION
vec4 setAlpha(const in vec3 color, const in float alpha) { return vec4(color, alpha); }

//#pragma DECLARE_FUNCTION
vec4 setAlpha(const in vec3 color, const in vec4 alpha) { return vec4(color, alpha.a); }



#define LUV

//#pragma DECLARE_FUNCTION
float specularOcclusion(const in int occlude, const in float ao, const in vec3 normal, const in vec3 eyeVector) {
    if(occlude == 0) return 1.0;
    // Yoshiharu Gotanda's specular occlusion approximation:
    // cf http://research.tri-ace.com/Data/cedec2011_RealtimePBR_Implementation_e.pptx pg59
    float d = dot(normal, eyeVector) + ao;
    return clamp((d * d) - 1.0 + ao, 0.0, 1.0);
}

//#pragma DECLARE_FUNCTION
float adjustRoughnessNormalMap(const in float roughness, const in vec3 normal) {
    // Based on The Order : 1886 SIGGRAPH course notes implementation (page 21 notes)
    float normalLen = length(normal);
    if ( normalLen < 1.0) {
        float normalLen2 = normalLen * normalLen;
        float kappa = ( 3.0 * normalLen -  normalLen2 * normalLen )/( 1.0 - normalLen2 );
        // http://www.frostbite.com/2014/11/moving-frostbite-to-pbr/
        // page 91 : they use 0.5/kappa instead
        return min(1.0, sqrt( roughness * roughness + 1.0/kappa ));
    }
    return roughness;
}

//#pragma DECLARE_FUNCTION
float adjustRoughnessGeometry(const in float roughness, const in vec3 normal) {
    // Geometric Specular Aliasing (slide 43)
    // http://alex.vlachos.com/graphics/Alex_Vlachos_Advanced_VR_Rendering_GDC2015.pdf
// #ifdef GL_OES_standard_derivatives
//     vec3 vDx = dFdx( normal.xyz );
//     vec3 vDy = dFdy( normal.xyz );
//     return max(roughness, pow( clamp( max( dot( vDx, vDx ), dot( vDy, vDy ) ), 0.0, 1.0 ), 0.333 ));
// #else
    return roughness;
// #endif
}

//#pragma DECLARE_FUNCTION
mat3 environmentTransformPBR(const in mat4 transform) {
    // TODO trick from animation matrix transpose?
    vec3 x = vec3(transform[0][0], transform[1][0], transform[2][0]);
    vec3 y = vec3(transform[0][1], transform[1][1], transform[2][1]);
    vec3 z = vec3(transform[0][2], transform[1][2], transform[2][2]);
    mat3 m = mat3(x, y, z);
    return m;
}

//#pragma DECLARE_FUNCTION
vec3 computeDiffuseSPH(const in vec3 sphCoef[9], const in mat3 envTransform, const in vec3 normal) {
    vec3 n = envTransform * normal;
    // https://github.com/cedricpinson/envtools/blob/master/Cubemap.cpp#L523
    vec3 result =
        sphCoef[0] +
        sphCoef[1] * n.y +
        sphCoef[2] * n.z +
        sphCoef[3] * n.x +
        sphCoef[4] * n.y * n.x +
        sphCoef[5] * n.y * n.z +
        sphCoef[6] * (3.0 * n.z * n.z - 1.0) +
        sphCoef[7] * (n.z * n.x) +
        sphCoef[8] * (n.x * n.x - n.y * n.y);
     return max(result, vec3(0.0));
}

// Frostbite, Lagarde paper p67
// http://www.frostbite.com/wp-content/uploads/2014/11/course_notes_moving_frostbite_to_pbr.pdf
float linRoughnessToMipmap( const in float roughnessLinear ) {
    return sqrt(roughnessLinear);
}

vec3 integrateBRDF( const in vec3 specular, const in float r, const in float NoV, const in sampler2D tex ) {
    vec4 rgba = texture2D( tex, vec2(NoV, r) );
    float b = (rgba[3] * 65280.0 + rgba[2] * 255.0);
    float a = (rgba[1] * 65280.0 + rgba[0] * 255.0);
    const float div = 1.0/65535.0;
    return (specular * a + b) * div;
}

// https://www.unrealengine.com/blog/physically-based-shading-on-mobile
// TODO should we use somehow specular f0 ?
vec3 integrateBRDFApprox( const in vec3 specular, const in float roughness, const in float NoV ) {
    const vec4 c0 = vec4( -1, -0.0275, -0.572, 0.022 );
    const vec4 c1 = vec4( 1, 0.0425, 1.04, -0.04 );
    vec4 r = roughness * c0 + c1;
    float a004 = min( r.x * r.x, exp2( -9.28 * NoV ) ) * r.x + r.y;
    vec2 AB = vec2( -1.04, 1.04 ) * a004 + r.zw;
    return specular * AB.x + AB.y;
}

// basically whether it's panorama or cubemap we load the adequate glsl
// and we set samplerEnv and prefilterEnvMap
#ifdef CUBEMAP
// has to be before anything else, just after glsl language version
// it's require. enable just allow
vec3 textureCubemapLod(const in samplerCube texture, const in vec3 dir, const in float lod ) {
    vec4 rgba = textureCubeLodEXT( texture, dir, lod );
#ifdef FLOAT
    return rgba.rgb;
#endif
#ifdef RGBM
    return RGBMToRGB( rgba );
#endif
#ifdef LUV
    return LUVToRGB( rgba );
#endif
}

vec3 textureCubeLodEXTFixed(const in samplerCube texture, const in vec2 size, const in vec3 direction, const in float lodInput, const in float maxLod ) {
    vec3 dir = direction;
    float lod = min( maxLod, lodInput );

    // http://seblagarde.wordpress.com/2012/06/10/amd-cubemapgen-for-physically-based-rendering/
    float scale = 1.0 - exp2(lod) / size.x;
    vec3 absDir = abs(dir);
    float M = max(max(absDir.x, absDir.y), absDir.z);

    if (absDir.x != M) dir.x *= scale;
    if (absDir.y != M) dir.y *= scale;
    if (absDir.z != M) dir.z *= scale;

    return textureCubemapLod( texture, dir, lod );
}

vec3 prefilterEnvMapCube( const in float rLinear, const in vec3 R, const in samplerCube tex, const in vec2 lodRange, const in vec2 size ){
    float lod = linRoughnessToMipmap(rLinear) * lodRange[1]; //( uEnvironmentMaxLod - 1.0 );
    return textureCubeLodEXTFixed( tex, size, R, lod, lodRange[0] );
}

#define samplerEnv samplerCube
#define prefilterEnvMap prefilterEnvMapCube

#else
#ifdef PANORAMA

#define samplerEnv sampler2D
#define prefilterEnvMap prefilterEnvMapPanorama

#else
// in case there is no environment node ?
vec3 prefilterEnvMap( const in float rLinear, const in vec3 R, const in sampler2D tex, const in vec2 lodRange, const in vec2 size ) {
    return vec3(0.0);
}
#define samplerEnv sampler2D
#endif // PANORAMA

#endif // CUBEMAP

vec3 getSpecularDominantDir( const in vec3 N, const in vec3 R, const in float realRoughness ) {
    float smoothness = 1.0 - realRoughness;
    float lerpFactor = smoothness * ( sqrt( smoothness ) + realRoughness );
    // The result is not normalized as we fetch in a cubemap
    return mix( N, R, lerpFactor );
}

#ifdef TEXTURE_BRDF
#define OPT_ARG_texBRDF ,const in sampler2D texBRDF
#else
#define OPT_ARG_texBRDF
#endif

// samplerEnv and prefilterEnvMap are both defined above (cubemap or panorama)
//#pragma DECLARE_FUNCTION
vec3 computeIBLSpecularUE4(
    const in vec3 normal,
    const in vec3 eyeVector,
    const in float roughness,
    const in vec3 specular,
    const in mat3 envTransform,
    const in samplerEnv texSpecular,
    const in vec2 lodRange,
    const in vec2 texSize,
    const in vec3 frontNormal
    OPT_ARG_texBRDF) {

    float rough = max( roughness, 0.0 );

    float NoV = dot( normal, eyeVector );
    vec3 R = normalize( NoV * 2.0 * normal - eyeVector );
    R = getSpecularDominantDir( normal, R, roughness );
    // could use that, especially if NoV comes from shared preCompSpec
    //vec3 R = reflect( -eyeVector, normal );

    vec3 prefilteredColor = prefilterEnvMap( rough, envTransform * R, texSpecular, lodRange, texSize );
    // http://marmosetco.tumblr.com/post/81245981087
    // marmoset uses 1.3, we force it to 1.0
    float factor = clamp( 1.0 + dot( R, frontNormal ), 0.0, 1.0 );
    prefilteredColor *= factor * factor;
    #ifdef TEXTURE_BRDF
    return prefilteredColor * integrateBRDF( specular, rough, NoV, texBRDF );
    #else
    return prefilteredColor * integrateBRDFApprox( specular, rough, NoV );
    #endif
}





float getLightAttenuation(const in float dist, const in vec4 lightAttenuation) {
    // lightAttenuation(constantEnabled, linearEnabled, quadraticEnabled)
    // TODO find a vector alu instead of 4 scalar
    float constant = lightAttenuation.x;
    float linear = lightAttenuation.y * dist;
    float quadratic = lightAttenuation.z * dist * dist;
    return 1.0 / (constant + linear + quadratic);
}

//#pragma DECLARE_FUNCTION
void precomputeSpot(
        const in vec3 normal,
        const in vec3 viewVertex,
                          
        const in vec3 lightViewDirection,
        const in vec4 lightAttenuation,
        const in vec3 lightViewPosition,
        const in float lightSpotCutOff,
        const in float lightSpotBlend,
                          
        out float attenuation,
        out vec3 eyeLightDir,
        out float dotNL) {

    eyeLightDir = lightViewPosition - viewVertex;
    float dist = length(eyeLightDir);
    eyeLightDir = dist > 0.0 ? eyeLightDir / dist : vec3( 0.0, 1.0, 0.0 );

    float cosCurAngle = dot(-eyeLightDir, lightViewDirection);
    float spot = cosCurAngle * smoothstep(0.0, 1.0, (cosCurAngle - lightSpotCutOff) / lightSpotBlend);

    dotNL = dot(eyeLightDir, normal);
    attenuation = spot * getLightAttenuation(dist, lightAttenuation);
}

//#pragma DECLARE_FUNCTION
void precomputePoint(
        const in vec3 normal,
        const in vec3 viewVertex,

        const in vec4 lightAttenuation,
        const in vec3 lightViewPosition,

        out float attenuation,
        out vec3 eyeLightDir,
        out float dotNL) {

    eyeLightDir = lightViewPosition - viewVertex;
    float dist = length(eyeLightDir);

    attenuation = getLightAttenuation(dist, lightAttenuation);
    eyeLightDir = dist > 0.0 ? eyeLightDir / dist :  vec3( 0.0, 1.0, 0.0 );
    dotNL = dot(eyeLightDir, normal);
}

//#pragma DECLARE_FUNCTION
void precomputeSun(
        const in vec3 normal,
        const in vec3 lightViewDirection,
  
        out float attenuation,
        out vec3 eyeLightDir,
        out float dotNL) {

    attenuation = 1.0;
    eyeLightDir = -lightViewDirection;
    dotNL = dot(eyeLightDir, normal);
}
#define PI 3.141593
#define saturate(_x) clamp(_x, 0., 1.)



// light PBR glsl
#define G1V(dotNV, k) (1./(dotNV*(1.-k)+k))

//#pragma DECLARE_FUNCTION
vec4 precomputeGGX(const in vec3 normal, const in vec3 eyeVector, const in float roughness) {
    float dotNV = saturate(dot(normal, eyeVector));
    float alpha = roughness * roughness;
    float k = alpha * 0.5;
    float visNV = G1V(dotNV, k);

    return vec4(alpha, alpha * alpha, k, visNV);
}

vec3 computeGGX(const vec4 precomputeGGX, const vec3 normal, const vec3 eyeVector, const vec3 eyeLightDir, const vec3 F0, const float dotNL) {

    vec3 H = normalize(eyeVector + eyeLightDir);
    float dotNH = saturate(dot(normal, H));
    // D
    float alphaSqr = precomputeGGX.y;
    float denom = dotNH * dotNH * (alphaSqr - 1.0) + 1.0;
    float D = alphaSqr / (PI * denom * denom);

    // F
    float dotLH = saturate(dot(eyeLightDir, H));
    float dotLH5 = pow(1.0 - dotLH, 5.0);
    vec3 F = vec3(F0) + (vec3(1.0) - F0) * (dotLH5);

    // V
    float visNL = G1V(dotNL, precomputeGGX.z);
    return D * F * visNL * precomputeGGX.w;
}

// pure compute Light PBR
//#pragma DECLARE_FUNCTION
void computeLightLambertGGX(
    const in vec3 normal,
    const in vec3 eyeVector,
    const in float dotNL,
    const in vec4 precomputeGGX,
    
    const in vec3 diffuse,
    const in vec3 specular,
    
    const in float attenuation,
    const in vec3 lightColor,
    const in vec3 eyeLightDir,
    
    out vec3 diffuseOut,
    out vec3 specularOut,
    out bool lighted) {

    lighted = dotNL > 0.0;
    if (lighted == false) {
        specularOut = diffuseOut = vec3(0.0);
        return;
    }

    vec3 colorAttenuate = attenuation * dotNL * lightColor;
    specularOut = colorAttenuate * computeGGX(precomputeGGX, normal, eyeVector, eyeLightDir, specular, dotNL);
    diffuseOut = colorAttenuate * diffuse;
}


#ifdef _OUT_DISTANCE
#define OPT_ARG_outDistance ,out float outDistance
#define OPT_INSTANCE_ARG_outDistance ,outDistance
#else
#define OPT_ARG_outDistance
#define OPT_INSTANCE_ARG_outDistance
#endif

#ifdef _ATLAS_SHADOW
#define OPT_ARG_atlasSize ,const in vec4 atlasSize
#else
#define OPT_ARG_atlasSize
#endif

#ifdef _NORMAL_OFFSET
#define OPT_ARG_normalBias ,const in float normalBias
#else
#define OPT_ARG_normalBias
#endif

#ifdef _JITTER_OFFSET
#define OPT_ARG_jitter ,const in float jitter
#define OPT_INSTANCE_ARG_jitter ,jitter
#else
#define OPT_ARG_jitter
#define OPT_INSTANCE_ARG_jitter
#endif


float decodeFloatRGBA( vec4 rgba ) {
    return dot( rgba, vec4(1.0, 1.0/255.0, 1.0/65025.0, 1.0/16581375.0) );
}

vec4 encodeFloatRGBA( float v ) {
    vec4 enc = vec4(1.0, 255.0, 65025.0, 16581375.0) * v;
    enc = fract(enc);
    enc -= enc.yzww * vec4(1.0/255.0,1.0/255.0,1.0/255.0,0.0);
    return enc;
}

vec2 decodeHalfFloatRGBA( vec4 rgba ) {
    return vec2(rgba.x + (rgba.y / 255.0), rgba.z + (rgba.w / 255.0));
}

vec4 encodeHalfFloatRGBA( vec2 v ) {
    const vec2 bias = vec2(1.0 / 255.0, 0.0);
    vec4 enc;
    enc.xy = vec2(v.x, fract(v.x * 255.0));
    enc.xy = enc.xy - (enc.yy * bias);

    enc.zw = vec2(v.y, fract(v.y * 255.0));
    enc.zw = enc.zw - (enc.ww * bias);
    return enc;
}


// end Float codec
float getSingleFloatFromTex(const in sampler2D depths, const in vec2 uv){
#ifndef _FLOATTEX
    return  decodeFloatRGBA(texture2D(depths, uv));
#else
    return texture2D(depths, uv).x;
#endif
}

vec2 getDoubleFloatFromTex(const in sampler2D depths, const in vec2 uv){
#ifndef _FLOATTEX
    return decodeHalfFloatRGBA(texture2D(depths, uv));
#else
    return texture2D(depths, uv).xy;
#endif
}

vec4 getQuadFloatFromTex(const in sampler2D depths, const in vec2 uv){
    return texture2D(depths, uv).xyzw;
}
// end Float codec


// simulation of texture2Dshadow glsl call on HW
// http://codeflow.org/entries/2013/feb/15/soft-shadow-mapping/
float texture2DCompare(const in sampler2D depths,
                       const in vec2 uv,
                       const in float compare,
                       const in vec4 clampDimension){
    float depth = getSingleFloatFromTex(depths, clamp(uv, clampDimension.xy, clampDimension.zw));
    return compare - depth;
}

#ifdef _JITTER_OFFSET
#define INT_SCALE3_JITTER vec3(.1031, .1030, .0973)
// uniform rand
vec3 randJitter(const in vec3 p2) {
    vec3 p3  = fract(p2.xyz * INT_SCALE3_JITTER);
    p3 += dot(p3, p3.yzx + 19.19);
    p3 = fract((p3.xxy + p3.yzz) * p3.zyx);
    return p3;
}
#endif

// simulates linear fetch like texture2d shadow
float texture2DShadowLerp(
    const in sampler2D depths,
    const in vec4 size,
    const in vec2 uv,
    const in float compare,
    const in vec4 clampDimension
    OPT_ARG_outDistance
    OPT_ARG_jitter){

    vec2 centroidCoord = uv * size.xy;

#ifdef _JITTER_OFFSET
    if (jitter > 0.0){
        centroidCoord += randJitter(vec3(gl_FragCoord.xy, jitter)).xy;
    }
#endif

    centroidCoord = centroidCoord + 0.5;
    vec2 f = fract(centroidCoord);
    vec2 centroidUV = floor(centroidCoord) * size.zw;

    vec4 fetches;
    const vec2 shift  = vec2(1.0, 0.0);
    fetches.x = texture2DCompare(depths, centroidUV + size.zw * shift.yy, compare, clampDimension);
    fetches.y = texture2DCompare(depths, centroidUV + size.zw * shift.yx, compare, clampDimension);
    fetches.z = texture2DCompare(depths, centroidUV + size.zw * shift.xy, compare, clampDimension);
    fetches.w = texture2DCompare(depths, centroidUV + size.zw * shift.xx, compare, clampDimension);



#ifdef _OUT_DISTANCE
    float _a = mix(fetches.x, fetches.y, f.y);
    float _b = mix(fetches.z, fetches.w, f.y);
    outDistance = mix(_a, _b, f.x);
#endif

    vec4 st = step(fetches, vec4(0.0));

    float a = mix(st.x, st.y, f.y);
    float b = mix(st.z, st.w, f.y);
    return mix(a, b, f.x);
}


float getShadowPCF(
    const in sampler2D depths,
    const in vec4 size,
    const in vec2 uv,
    const in float compare,
    const in vec2 biasPCF,
    const in vec4 clampDimension
    OPT_ARG_outDistance
    OPT_ARG_jitter) {

     float res = 0.0;

     res += texture2DShadowLerp(depths, size, uv + biasPCF, compare, clampDimension OPT_INSTANCE_ARG_outDistance OPT_INSTANCE_ARG_jitter);


#if defined(_PCFx1)

#else

    float dx0 = -size.z;
    float dy0 = -size.w;
    float dx1 = size.z;
    float dy1 = size.w;

#define TSF(o1,o2) texture2DShadowLerp(depths, size, uv + vec2(o1, o2) + biasPCF, compare, clampDimension OPT_INSTANCE_ARG_outDistance OPT_INSTANCE_ARG_jitter)

    res += TSF(dx0, dx0);
    res += TSF(dx0, .0);
    res += TSF(dx0, dx1);

#if defined(_PCFx4)

    res /=4.0;

#elif defined(_PCFx9)
    res += TSF(.0, dx0);
    res += TSF(.0, dx1);

    res += TSF(dx1, dx0);
    res += TSF(dx1, .0);
    res += TSF(dx1, dx1);


    res /=9.0;

#elif defined(_PCFx25)

    float dx02 = -2.0*size.z;
    float dy02 = -2.0*size.w;
    float dx2 = 2.0*size.z;
    float dy2 = 2.0*size.w;

    // complete row above
    res += TSF(dx0, dx02);
    res += TSF(dx0, dx2);

    res += TSF(.0, dx02);
    res += TSF(.0, dx2);

    res += TSF(dx1, dx02);
    res += TSF(dx1, dx2);

    // two new col
    res += TSF(dx02, dx02);
    res += TSF(dx02, dx0);
    res += TSF(dx02, .0);
    res += TSF(dx02, dx1);
    res += TSF(dx02, dx2);

    res += TSF(dx2, dx02);
    res += TSF(dx2, dx0);
    res += TSF(dx2, .0);
    res += TSF(dx2, dx1);
    res += TSF(dx2, dx2);


    res/=25.0;

#endif

#undef TSF

#endif
    return res;
}
/////// end Tap


//#pragma DECLARE_FUNCTION DERIVATIVES:enable
float shadowReceive(const in bool lighted,
                    const in vec3 normalWorld,
                    const in vec3 vertexWorld,
                    const in sampler2D shadowTexture,
                    const in vec4 shadowSize,
                    const in mat4 shadowProjectionMatrix,
                    const in mat4 shadowViewMatrix,
                    const in vec4 shadowDepthRange,
                    const in float shadowBias
                    OPT_ARG_atlasSize
                    OPT_ARG_normalBias
                    OPT_ARG_outDistance
                    OPT_ARG_jitter) {

    // 0 for early out
    bool earlyOut = false;

    // Calculate shadow amount
    float shadow = 1.0;

    if (!lighted) {
        shadow = 0.0;
#ifndef _OUT_DISTANCE
        earlyOut = true;
#endif // _OUT_DISTANCE
    }

    if (shadowDepthRange.x == shadowDepthRange.y) {
        earlyOut = true;
    }

    vec4 shadowVertexEye;
    vec4 shadowNormalEye;
    float shadowReceiverZ = 0.0;
    vec4 shadowVertexProjected;
    vec2 shadowUV;
    float N_Dot_L;

    if (!earlyOut) {

        shadowVertexEye =  shadowViewMatrix *  vec4(vertexWorld, 1.0);

        vec3 shadowLightDir = vec3(0.0, 0.0, 1.0); // in shadow view light is camera
        vec4 normalFront = vec4(normalWorld, 0.0);
        shadowNormalEye =  shadowViewMatrix * normalFront;
        N_Dot_L = dot(shadowNormalEye.xyz, shadowLightDir);

        if (!earlyOut) {

#ifdef _NORMAL_OFFSET
            // http://www.dissidentlogic.com/old/images/NormalOffsetShadows/GDC_Poster_NormalOffset.png
            float normalOffsetScale = clamp(1.0  - N_Dot_L, 0.0 , 1.0);
            normalOffsetScale *= abs((shadowVertexEye.z - shadowDepthRange.x) * shadowDepthRange.w);
            normalOffsetScale *= max(shadowProjectionMatrix[0][0], shadowProjectionMatrix[1][1]);
            normalOffsetScale *= normalBias * shadowDepthRange.w;
            shadowNormalEye =  shadowViewMatrix *  (normalFront * normalOffsetScale);
            shadowVertexProjected = shadowProjectionMatrix * (shadowVertexEye + shadowNormalEye);
#else
            shadowVertexProjected = shadowProjectionMatrix * shadowVertexEye;
#endif

            if (shadowVertexProjected.w < 0.0) {
                earlyOut = true; // notably behind camera
            }

        }

        if (!earlyOut) {

            shadowUV.xy = shadowVertexProjected.xy / shadowVertexProjected.w;
            shadowUV.xy = shadowUV.xy * 0.5 + 0.5;// mad like

            if (any(bvec4 ( shadowUV.x > 1., shadowUV.x < 0., shadowUV.y > 1., shadowUV.y < 0.))) {
                earlyOut = true;// limits of light frustum
            }

            // most precision near 0, make sure we are near 0 and in [0,1]
            shadowReceiverZ = - shadowVertexEye.z;
            shadowReceiverZ =  (shadowReceiverZ - shadowDepthRange.x) * shadowDepthRange.w;

            if(shadowReceiverZ < 0.0) {
                earlyOut = true; // notably behind camera
            }

        }
    }

    // pcf pbias to add on offset
    vec2 shadowBiasPCF = vec2 (0.);

#ifdef GL_OES_standard_derivatives
#ifdef _RECEIVERPLANEDEPTHBIAS
    vec2 biasUV;

    vec3 texCoordDY = dFdx(shadowVertexEye.xyz);
    vec3 texCoordDX = dFdy(shadowVertexEye.xyz);

    biasUV.x = texCoordDY.y * texCoordDX.z - texCoordDX.y * texCoordDY.z;
    biasUV.y = texCoordDX.x * texCoordDY.z - texCoordDY.x * texCoordDX.z;
    biasUV *= 1.0 / ((texCoordDX.x * texCoordDY.y) - (texCoordDX.y * texCoordDY.x));

    // Static depth biasing to make up for incorrect fractional sampling on the shadow map grid
    float fractionalSamplingError = dot(vec2(1.0, 1.0) * shadowSize.zw, abs(biasUV));
    float receiverDepthBias = min(fractionalSamplingError, 0.01);

    shadowBiasPCF.x = biasUV.x;
    shadowBiasPCF.y = biasUV.y;

    shadowReceiverZ += receiverDepthBias;

#else // _RECEIVERPLANEDEPTHBIAS
    shadowBiasPCF.x = clamp(dFdx(shadowReceiverZ)* shadowSize.z, -1.0, 1.0 );
    shadowBiasPCF.y = clamp(dFdy(shadowReceiverZ)* shadowSize.w, -1.0, 1.0 );
#endif

#endif // GL_OES_standard_derivatives


    vec4 clampDimension;

#ifdef _ATLAS_SHADOW
    shadowUV.xy  = ((shadowUV.xy * atlasSize.zw ) + atlasSize.xy) / shadowSize.xy;

    // clamp uv bias/filters by half pixel to avoid point filter on border
    clampDimension.xy = atlasSize.xy + vec2(0.5);
    clampDimension.zw = (atlasSize.xy + atlasSize.zw) - vec2(0.5);

    clampDimension = clampDimension / (shadowSize.xyxy);
#else
    clampDimension = vec4(0.0, 0.0, 1.0, 1.0);
#endif // _RECEIVERPLANEDEPTHBIAS


    // now that derivatives is done and we don't access any mipmapped/texgrad texture we can early out
    // see http://teknicool.tumblr.com/post/77263472964/glsl-dynamic-branching-and-texture-samplers
    if (earlyOut) {
        // empty statement because of weird gpu intel bug
    } else {

        // depth bias: fighting shadow acne (depth imprecsion z-fighting)
        // cosTheta is dot( n, l ), clamped between 0 and 1
        // float shadowBias = 0.005*tan(acos(N_Dot_L));
        // same but 4 cycles instead of 15
        float depthBias = 0.05 * sqrt( 1.0 - N_Dot_L * N_Dot_L) / clamp(N_Dot_L, 0.0005, 1.0);

        // That makes sure that plane perpendicular to light doesn't flicker due to
        // selfshadowing and 1 = dot(Normal, Light) using a min bias
        depthBias = clamp(depthBias, 0.00005, 2.0 * shadowBias);

        // shadowZ must be clamped to [0,1]
        // otherwise it's not comparable to shadow caster depth map
        // which is clamped to [0,1]
        // Not doing that makes ALL shadowReceiver > 1.0 black
        // because they ALL becomes behind any point in Caster depth map
        shadowReceiverZ = clamp(shadowReceiverZ, 0.0, 1.0 -depthBias) - depthBias;

        // Now computes Shadow
        float res = getShadowPCF(shadowTexture,
                                 shadowSize,
                                 shadowUV,
                                 shadowReceiverZ,
                                 shadowBiasPCF,
                                 clampDimension
                                 OPT_INSTANCE_ARG_outDistance
                                 OPT_INSTANCE_ARG_jitter);
#ifdef _OUT_DISTANCE
        if (lighted) shadow = res;
        outDistance *= shadowDepthRange.z; // world space distance
#else
        shadow = res;
#endif  // _OUT_DISTANCE
    }

    return shadow;

}




#define _linTest(color, keepLinear) { return keepLinear == 1 ? color : linearTosRGB(color); }

//#pragma DECLARE_FUNCTION
float linearTosRGBWithTest(const in float color, const in int keepLinear) _linTest(color, keepLinear)

//#pragma DECLARE_FUNCTION
vec3 linearTosRGBWithTest(const in vec3 color, const in int keepLinear) _linTest(color, keepLinear)

//#pragma DECLARE_FUNCTION
vec4 linearTosRGBWithTest(const in vec4 color, const in int keepLinear) _linTest(color, keepLinear)

//#pragma DECLARE_FUNCTION
float adjustSpecular( const in float specular, const in vec3 normal ) {
    // Based on The Order : 1886 SIGGRAPH course notes implementation (page 21 notes)
    float normalLen = length(normal);
    if ( normalLen < 1.0) {
        float normalLen2 = normalLen * normalLen;
        float kappa = ( 3.0 * normalLen -  normalLen2 * normalLen )/( 1.0 - normalLen2 );
        // http://www.frostbite.com/2014/11/moving-frostbite-to-pbr/
        // page 91 : they use 0.5/kappa instead
        return 1.0-min(1.0, sqrt( (1.0-specular) * (1.0-specular) + 1.0/kappa ));
    }
    return specular;
}

//#pragma DECLARE_FUNCTION
vec3 normalTangentSpace(const in vec4 tangent, const in vec3 normal, const in vec3 texNormal) {
    vec3 tang = vec3(0.0,1.0,0.0);
    float l = length(tangent.xyz);
    if (l != 0.0) {
        //normalize reusing length computations
        // tang =  normalize(tangent.xyz);
        tang =  tangent.xyz / l;
    }
    vec3 B = tangent.w * normalize(cross(normal, tang));
    return normalize( texNormal.x * tang + texNormal.y * B + texNormal.z * normal);
}

//#pragma DECLARE_FUNCTION
vec2 normalMatcap(const in vec3 normal, const in vec3 eyeVector) {
    vec3 nm_x = vec3(-eyeVector.z, 0.0, eyeVector.x);
    vec3 nm_y = cross(nm_x, eyeVector);
    return vec2(dot(normal.xz, -nm_x.xz), dot(normal, nm_y)) * vec2(0.5)  + vec2(0.5);
}

//#pragma DECLARE_FUNCTION
vec3 textureNormalMap(const in vec3 normal, const in int flipY) {
    vec3 rgb = normal * vec3(2.0) + vec3(-1.0); // MADD vec form
    rgb[1] = flipY == 1 ? -rgb[1] : rgb[1];
    return rgb;
}

//#pragma DECLARE_FUNCTION
vec3 bumpMap(const in vec4 tangent, const in vec3 normal, const in vec2 gradient) {
    vec3 outnormal;
    float l = length(tangent.xyz);
    if (l != 0.0) {
        //normalize reusing length computations
        // vec3 tang =  normalize(tangent.xyz);
        vec3 tang =  tangent.xyz / l;
        vec3 binormal = tangent.w * normalize(cross(normal, tang));
        outnormal = normal + gradient.x * tang + gradient.y * binormal;
    }
    else {
       outnormal = vec3(normal.x + gradient.x, normal.y + gradient.y, normal.z);
    }
    return normalize(outnormal);
}

//#pragma DECLARE_FUNCTION
float checkerboard(const in vec2 uv, const in vec4 halton) {
    float taaSwap = step(halton.z, 0.0);
    return mod(taaSwap + floor(uv.x) + floor(uv.y), 2.0);
}

// random links on packing :
// cesium attributes packing
// https://cesiumjs.org/2015/05/18/Vertex-Compression/

// float packing in 24 bits or 32 bits
// https://skytiger.wordpress.com/2010/12/01/packing-depth-into-color/

//#pragma DECLARE_FUNCTION
vec4 EncodeDepthAlphaProfileScatter(const in float depth, const in float alpha, const in float profile, const in float scatter) {
    vec4 pack = vec4(0.0);

    // opacity in alpha
    pack.a = alpha;

    if(profile == 0.0) {
        const vec3 code = vec3(1.0, 255.0, 65025.0);
        pack.rgb = vec3(code * depth);
        pack.gb = fract(pack.gb);
        pack.rg -= pack.gb * (1.0 / 256.0);
    } else {
        // depth in rg
        pack.g = fract(depth * 255.0);
        pack.r = depth - pack.g / 255.0;

        // scatter 6 bits
        pack.b = floor(0.5 + scatter * 63.0) * 4.0 / 255.0;
    }

    // profile on 2 lower bits
    pack.b -= mod(pack.b, 4.0 / 255.0);
    pack.b += profile / 255.0; // 3 profile possible for sss

    return pack;
}

int decodeProfile(const in vec4 pack) {
    float packValue = floor(pack.b * 255.0 + 0.5);
    // we extract the 2 lowest bits
    float profile = mod(packValue, 2.0);
    profile += mod(packValue - profile, 4.0);
    return int(profile);
}

float decodeDepth(const in vec4 pack) {
    if(decodeProfile(pack) == 0){
        const vec3 decode = 1.0 / vec3(1.0, 255.0, 65025.0);
        return dot(pack.rgb, decode);
    }

    return pack.r + pack.g / 255.0;
}

float decodeScatter(const in vec4 pack) {
    float scatter = pack.b - mod(pack.b, 4.0 / 255.0);
    return scatter * 255.0 / 4.0 / 63.0;
}

float decodeAlpha(const in vec4 pack) {
    return pack.a;
}

float getLuminance(const in vec3 color) {
    // http://stackoverflow.com/questions/596216/formula-to-determine-brightness-of-rgb-color
    const vec3 colorBright = vec3(0.2126, 0.7152, 0.0722);
    return dot(color, colorBright);
}

float distanceToDepth(const in sampler2D depth, const in vec2 uv, const in vec4 viewPos, const vec2 nearFar){
    float fragDepth = clamp( (-viewPos.z * viewPos.w - nearFar.x) / (nearFar.y - nearFar.x), 0.0, 1.0);
    return fragDepth - decodeDepth(texture2D(depth, uv));
}


void main() {
// vars

float tmp_0; vec3 tmp_1; float tmp_2; vec3 geoNormal; vec3 nFrontViewNormal; vec3 frontViewNormal; vec3 eyeVector; float tmp_14 = -1.0; vec4 prepGGX; float materialRoughness; float channelGlossinessPBR; float tmp_18 = float(1.0); float tmp_20; float tmp_21; vec3 materialDiffusePBR; float channelMetalnessPBR; vec3 materialAlbedo; vec3 channelAlbedoPBR; vec3 AlbedoPBRFetch; vec3 tmp_30; vec3 materialSpecularPBR; float materialSpecularf0; float channelSpecularF0; float tmp_35 = float(1.0); float tmp_37 = 0.0; float tmp_38 = 0.08; vec3 tmp_40; vec3 tmp_41; bool tmp_42; vec3 nFrontModelNormal; vec3 frontModelNormal; float tmp_54; float tmp_56; vec3 tmp_57; float tmp_58; vec3 tmp_65; vec3 tmp_66; bool tmp_67; float tmp_73; float tmp_75; vec3 tmp_76; float tmp_77; vec3 tmp_80; vec3 tmp_81; bool tmp_82; float tmp_88; vec3 tmp_90; vec3 tmp_91; vec3 envDiffuse; vec3 tmp_94; mat3 envTransform; float tmp_98 = float(1.0); vec3 envSpecular; vec3 tmp_101; float tmp_105 = float(1.0); vec3 tmp_106; vec3 tmp_107; float tmp_108 = float(1.0); vec3 tmp_109;

// end vars

frontViewNormal = _frontNormal( vViewNormal );

nFrontViewNormal = _normalize( frontViewNormal );

geoNormal = nFrontViewNormal;
envTransform = environmentTransformPBR( uEnvironmentTransform );

tmp_94 = computeDiffuseSPH( uDiffuseSPH, envTransform, geoNormal );

AlbedoPBRFetch = texture2D(Texture0, vTexCoord6).rgb;
tmp_30 = sRGBToLinear( AlbedoPBRFetch );

channelAlbedoPBR = tmp_30*uAlbedoPBRFactor;
materialAlbedo = channelAlbedoPBR;
channelMetalnessPBR = uMetalnessPBRFactor;
materialDiffusePBR = materialAlbedo * (1.0 - channelMetalnessPBR);
envDiffuse = tmp_94*materialDiffusePBR*uEnvironmentExposure*tmp_98;
eyeVector = vViewVertex.rgb;
eyeVector = _normalize( eyeVector );

eyeVector = eyeVector*tmp_14;
channelGlossinessPBR = tmp_18*uGlossinessPBRFactor;
tmp_20 = 1.0 - channelGlossinessPBR;
tmp_21 = max(1.e-4, tmp_20);
materialRoughness = adjustRoughnessGeometry( tmp_21, nFrontViewNormal );

channelSpecularF0 = tmp_35*uSpecularF0Factor;
materialSpecularf0 = mix(tmp_37, tmp_38, channelSpecularF0);
materialSpecularPBR = mix( vec3(materialSpecularf0), materialAlbedo, channelMetalnessPBR);
tmp_101 = computeIBLSpecularUE4( geoNormal, eyeVector, materialRoughness, materialSpecularPBR, envTransform, sSpecularPBR, uTextureEnvironmentSpecularPBRLodRange, uTextureEnvironmentSpecularPBRTextureSize, nFrontViewNormal, sIntegrateBRDF );

envSpecular = tmp_101*tmp_105*uEnvironmentExposure;
precomputeSpot( geoNormal, vViewVertex.rgb, uSketchfabLight0_viewDirection, uSketchfabLight0_attenuation, uSketchfabLight0_viewPosition.rgb, uSketchfabLight0_spotCutOff, uSketchfabLight0_spotBlend, tmp_0, tmp_1, tmp_2 );

prepGGX = precomputeGGX( geoNormal, eyeVector, materialRoughness );

computeLightLambertGGX( geoNormal, eyeVector, tmp_2, prepGGX, materialDiffusePBR, materialSpecularPBR, tmp_0, uSketchfabLight0_diffuse.rgb, tmp_1, tmp_40, tmp_41, tmp_42 );

frontModelNormal = _frontNormal( vModelNormal );

nFrontModelNormal = _normalize( frontModelNormal );

tmp_54 = shadowReceive( tmp_42, nFrontModelNormal, vModelVertex, Texture7, uShadow_Texture0_renderSize, uShadow_Texture0_projectionMatrix, uShadow_Texture0_viewMatrix, uShadow_Texture0_depthRange, uShadowReceive0_bias, uShadow_Texture0_mapSize, uStaticFrameNumShadow0 );

tmp_40 = tmp_40*tmp_54;
precomputeSpot( geoNormal, vViewVertex.rgb, uSketchfabLight1_viewDirection, uSketchfabLight1_attenuation, uSketchfabLight1_viewPosition.rgb, uSketchfabLight1_spotCutOff, uSketchfabLight1_spotBlend, tmp_56, tmp_57, tmp_58 );

computeLightLambertGGX( geoNormal, eyeVector, tmp_58, prepGGX, materialDiffusePBR, materialSpecularPBR, tmp_56, uSketchfabLight1_diffuse.rgb, tmp_57, tmp_65, tmp_66, tmp_67 );

tmp_73 = shadowReceive( tmp_67, nFrontModelNormal, vModelVertex, Texture7, uShadow_Texture0_renderSize, uShadow_Texture1_projectionMatrix, uShadow_Texture1_viewMatrix, uShadow_Texture1_depthRange, uShadowReceive1_bias, uShadow_Texture1_mapSize, uStaticFrameNumShadow1 );

tmp_65 = tmp_65*tmp_73;
precomputeSun( geoNormal, uSketchfabLight3_viewDirection, tmp_75, tmp_76, tmp_77 );

computeLightLambertGGX( geoNormal, eyeVector, tmp_77, prepGGX, materialDiffusePBR, materialSpecularPBR, tmp_75, uSketchfabLight3_diffuse.rgb, tmp_76, tmp_80, tmp_81, tmp_82 );

tmp_88 = shadowReceive( tmp_82, nFrontModelNormal, vModelVertex, Texture7, uShadow_Texture0_renderSize, uShadow_Texture3_projectionMatrix, uShadow_Texture3_viewMatrix, uShadow_Texture3_depthRange, uShadowReceive3_bias, uShadow_Texture3_mapSize, uStaticFrameNumShadow3 );

tmp_80 = tmp_80*tmp_88;
tmp_90 = tmp_40+tmp_65+tmp_80;
tmp_41 = tmp_41*tmp_54;
tmp_66 = tmp_66*tmp_73;
tmp_81 = tmp_81*tmp_88;
tmp_91 = tmp_41+tmp_66+tmp_81;
tmp_106 = envDiffuse+envSpecular+tmp_90+tmp_91;
tmp_107 = tmp_106*tmp_108;
tmp_109 = linearTosRGBWithTest( tmp_107, uOutputLinear );

gl_FragColor = encodeRGBM( tmp_109, uRGBMRange );

}