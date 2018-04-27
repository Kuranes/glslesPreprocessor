
    #version 100
    
// https://www.khronos.org/registry/gles/extensions/EXT/EXT_sRGB.txt
#define LIN_SRGB(x) x < 0.0031308 ? x * 12.92 : 1.055 * pow(x, 1.0/2.4) - 0.055
//#pragma DECLARE_FUNCTION
float linearTosRGB(const in float color) { return LIN_SRGB(color); }
#define saturate(_x) clamp(_x, 0., 1.)
saturate(dot(normal, eyeVector));

    #define ON

    float sum = 0.0;

    void main()
    {

    #ifdef ON
    //yes
    sum += 1.0;

        #ifdef OFF
        //no
        sum += 20.0;
        #endif

        #if defined(ON)
        //yes
        sum += 300.0;
        #endif

    #endif


    #if defined(OFF)
    //no
    sum += 4000.0;

    #if !defined(ON)
    //no
    sum += 50000.0;
    #endif

        //no
        sum += 0.1;
        #ifdef ON
            //no
            sum += 0.2;
        #endif

        //no
        sum += 0.01;
        #ifdef ON
            //no
            sum += 0.02;
        #else
            //no
            sum += 0.03;
        #endif

    //no
        sum + 0.3;

    #endif


    #if !defined(OFF)
    //yes
    sum += 600000.0;

        #if defined(ON) && !defined(OFF)
        //yes
        sum += 80000000.0;

            #if defined(OFF) || defined(ON)
            //yes
            sum += 900000000.0;

                #if defined(ON) && defined(OFF)
                    //no
                    sum += 0.7;
                #elif !defined(OFF)
                    //yes
                    sum += 7000000.0;
                #endif

            #endif

        #endif

    #endif

    // sum should be 987600301.0
        gl_Position = vec4(sum);
    }

    #undef ON

    #define  A 1
    #define  C 0
    #define  E 0
    #define  F 1
    #if A
        #if C
            #if E
                int selected4 = 1;
            #elif F
                int selected4 = 2;
            #else
                int selected4 = 3;
            #endif
        #endif
        int selected4 = 4;
    #endif

    #define  ZA 1
    #define  ZC 1
    #define  ZE 0
    #define  ZF 1
    #if ZA
        #if ZC
            #if ZE
                int selected2 = 1;
            #elif ZF
                int selected2 = 2;
            #else
                int selected2 = 3;
            #endif
        #endif
    #endif

    #define  AZA 1
    #define  AZC 1
    #define  AZE 0
    #define  AZF 0
    #if AZA
        #if AZC
            #if AZE
                int selected3 = 1;
            #elif AZF
                int selected3 = 2;
            #else
                int selected3 = 3;
            #endif
        #endif
    #endif

    #undef A
    #undef B
    #undef C
    #undef D
    #undef E
    #undef F

    #define FUNC(a,b)		a+b
    void foo985(){	FUNC( (((2))), ((3),4)); }



    #define X(n) n + 1
    #define Y(n, z) n + z
    #define Z(f) X(f)

    #define REALLY_LONG_MACRO_NAME_WITH_MANY_PARAMETERS(X1, X2, X3, X4, X5, X6, X7,\
        X8, X9, X10, X11, X12) X1+X2+X3+X4+X5+X6+X7+X8+X9+X10+X11+X12

    #define A(\
    Y\
    )\
    4 + 3 + Y

    int main() {
    gl_Position = vec4(X(3), Y(3, 4), Z(3));
    gl_Position = vec4(REALLY_LONG_MACRO_NAME_WITH_MANY_PARAMETERS(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12));
    gl_Position = vec4(A(3));
    }

    //**/*/est//  //**/*/est//
    #define COQUI
    //**/*/est//  //**/*/est//


    //**/*/est//  //**/*/est//
    #ifndef COQUI
    bbbbb1;
    #endif

    #ifdef COQUI
    aaaaa1;
    #endif

    #ifndef COQUIN
    aaaaa2;
    #else
    bbbbb2;
    #endif


    follow;

    #if defined (COQUIN)
    bbbbb3;
    #define aya
    #else
    aaaaa3;
    #endif

    #if !defined (COQUI)
    bbbbb4;
    #else
    aaaaa4;
    #endif


    #if !defined (COQUI)
    bbbbb5;
    #elif defined (COQUI)
    aaaaa5;
    #endif

    #if defined (COQUIN)
    bbbbb6;
    #elif defined (COQUI)
    aaaaa6;
    #endif

    #define qsdfq a +1
    #define CONSTITUTION2 + 20 \\
    + 50 \\
    - 10 +

    float a = 2020CONSTITUTION2qsdfq;

    #define AAAAA 5
    #define BBBBB AAAAA + 11
    #define OPT_INSTANCE_ARG_outDistance , distance
    #define OPT_INSTANCE_ARG_jitter  
    
    #define _linTest(color, keepLinear) { return keepLinear == 1 ? color : linearTosRGB(color); }

    #define EARF
    #define EARF(angel) angel+1
    #define GUY(a, b, c) angel+1
    #define AMERICA 10
    #define CONSTITUTION + 5 

    #ifdef EARF
    #if EARF || !defined EARF 

    uniform vec3 winding[EARF(AMERICA CONSTITUTION BBBBB)];
    uniform vec3 windin2g[EARF(AMERICA)];

    #elif 2
    uniform int goro;
    #elif 1 
    uniform vec3 zzzzzz;
    #endif
    uniform vec3 panacea[AMERICA];
    #endif

    #if defined(_PCFx1)

    #else
        float dy1 = size.w;

    #define TSF(o1,o2) texture2DShadowLerp(depths, size, uv + vec2(o1, o2) + biasPCF, compare, clampDimension OPT_INSTANCE_ARG_outDistance OPT_INSTANCE_ARG_jitter)

        res += TSF(dx0, dx1);

    #if defined(_PCFx4)

        res /=4.0;

    #elif defined(_PCFx9)
        res += TSF(.0, dx0);;
        res /=9.0;

    #elif defined(_PCFx25)

        res/=25.0;

    #endif

    #undef TSF
    #endif

    float TSF = 1.0:
    main(){
        int i, j;
        float k = 57:
        float pernicious = 4;
        for(i=0; i<56; i++){
        atest(k);
        k--;
        k++;
        for (j =    0;    j   <    4; j++){
            pernicious -= 1; atest(pernicious); ;
        }
        }
        return vec4(k*atest4(j)*getShadowPCF());
    }

    //**/*/est//  //**/*/est//
    
    //**/*/est//  //**/*/est//



    #define ON1

#define ON2

float sum = 0.0;

void main()
{
#if defined(ON1) && (defined(OFF) || defined(ON2))
//yes
    sum += 1.0;
#endif

#if !defined(ON1) || (defined(OFF) || (!defined(OFF2) && defined(ON2)))
//yes
    sum += 20.0;
#endif

#if defined(ON1) && (defined(OFF) || !defined(ON2))
//no
    sum += 0.1;
#endif

#if !defined(ON1) || (defined(OFF) || !defined(OFF2) && !defined(ON2))
//no
    sum += 0.2;
#endif

#if !defined(ON1) || !defined(OFF) || defined(ON2) && defined(OFF2)
//yes
    sum += 300.0;
#endif

#if (!defined(ON1) || !defined(OFF) || defined(ON2)) && defined(OFF2)
//no
    sum += 0.4;
#endif

// sum should be 321.0
    gl_Position = vec4(sum);
}

#define ADD(a, b) a + b + ((a) + ((b)));

float foo()
{
    return ADD(gl_Position.xyxwx, 3.0)  // ERROR, should be this line number
    return ADD(gl_Position.y, 3.0)
}

#define BIG aonetuhanoethuanoenaoethu snaoetuhs onethausoentuas hnoethaueohnatuoeh santuoehsantouhe snathoensuta hsnoethuasntoe hsnuathoesnuathoenstuh nsoethantseuh toae ua \
    antoeh uantheount oentahoent uahnsoethasnutoehansteuo santhu sneoathu snoethasnut oesanthoesna thusenotha nsthasunoeth ausntehsunathoensuathoesnta uhnsoetha usntoeh uanhs unosethu \
    antoehunatoehu natoehua oentha neotuhan toehu natoehu ntahoe nutah eu natoheunathoen uasoenuasoent asntoehsan tuosnthnu aohenuath eontha untoh eunth unth anth unth nth nth nt \
    a ntoehanu tunth nsont uhansoethausn oehsanthnt heauo eanthuo sh nahnoethansu tohe sanuthoe snathuoesntha snuothe anthusonehtasuntoeh asnuthonsa teauhntoeha onetuha nth \
    anoethuan toentauh noethauntohe anuthoe nathu noethaun oethanuthoe nathuoe ntahu enotha unetha ntuhenaothu enotahun eotha ntoehu aoehuntha enotuh aonethau noethu anoethuna toheua \
    ontehanutoe hnuathoena aoteha aonetuha 

// identical
#define BIG aonetuhanoethuanoenaoethu snaoetuhs onethausoentuas hnoethaueohnatuoeh santuoehsantouhe snathoensuta hsnoethuasntoe hsnuathoesnuathoenstuh nsoethantseuh toae ua \
    antoeh uantheount oentahoent uahnsoethasnutoehansteuo santhu sneoathu snoethasnut oesanthoesna thusenotha nsthasunoeth ausntehsunathoensuathoesnta uhnsoetha usntoeh uanhs unosethu \
    antoehunatoehu natoehua oentha neotuhan toehu natoehu ntahoe nutah eu natoheunathoen uasoenuasoent asntoehsan tuosnthnu aohenuath eontha untoh eunth unth anth unth nth nth nt \
    a ntoehanu tunth nsont uhansoethausn oehsanthnt heauo eanthuo sh nahnoethansu tohe sanuthoe snathuoesntha snuothe anthusonehtasuntoeh asnuthonsa teauhntoeha onetuha nth \
    anoethuan toentauh noethauntohe anuthoe nathu noethaun oethanuthoe nathuoe ntahu enotha unetha ntuhenaothu enotahun eotha ntoehu aoehuntha enotuh aonethau noethu anoethuna toheua \
    ontehanutoe hnuathoena aoteha aonetuha 

// ERROR, one character different
#define BIG aonetuhanoethuanoenaoethu snaoetuhs onethausoentuas hnoethaueohnatuoeh santuoehsantouhe snathoensuta hsnoethuasntoe hsnuathoesnuathoenstuh nsoethantseuh toae ua \
    antoeh uantheount oentahoent uahnsoethasnutoehansteuo santhu sneoathu snoethasnut oesanthoesna thusenotha nsthasunoeth ausntehsunathoensuathoesnta uhnsoetha usntoeh uanhs unosethu \
    antoehunatoehu natoehua oentha neotuhan toehu natoehu ntahoe nutah eu natoheunathoen uasoenuasoent asntoehsan tuosnthnu aohenuath eontha untoh eunth unth anth unth nth nth nt \
    a ntoehanu tunth nsont uhansoethasn oehsanthnt heauo eanthuo sh nahnoethansu tohe sanuthoe snathuoesntha snuothe anthusonehtasuntoeh asnuthonsa teauhntoeha onetuha nth \
    anoethuan toentauh noethauntohe anuthoe nathu noethaun oethanuthoe nathuoe ntahu enotha unetha ntuhenaothu enotahun eotha ntoehu aoehuntha enotuh aonethau noethu anoethuna toheua \
    ontehanutoe hnuathoena aoteha aonetuha 

#define BIGARGS1(aonthanotehu, bonthanotehu, conthanotehu, donthanotehu, eonthanotehu, fonthanotehu, gonthanotehu, honthanotehu, ionthanotehu, jonthanotehu, konthanotehu) jonthanotehu
#define BIGARGS2(aonthanotehu, bonthanotehu, conthanotehu, donthanotehu, eonthanotehu, fonthanotehu, gonthanotehu, honthanotehu, ionthanotehu, jonthanotehu, konthanotehu) jonthanotehu
#define BIGARGS3(aonthanotehu, bonthanotehu, conthanotehu, donthanotehu, eonthanotehu, fonthanotehu, gonthanotehu, honthanotehu, ionthanotehu, jonthanotehu, konthanotehu) jonthanotehu
#define BIGARGS4(aonthanotehu, bonthanotehu, conthanotehu, donthanotehu, eonthanotehu, fonthanotehu, gonthanotehu, honthanotehu, ionthanotehu, jonthanotehu, konthanotehu) jonthanotehu


#define foobar(a, b) a + b

#if foobar(1.1, 2.2)
#error good macro
#else
#error bad macro
#endif

#if foobar(1
;
#
#
#endif
#if foobar(1,
;
#
#
#endif
float c = foobar(1.1, 2.2
       );
#if foobar(1.1, 2.2
)
#if foobar(1.1, 2.2
#endif
#endif

#define VAL0 0
#define VAL1 1

#if UNDEF
#error bad 0
#else
#error good 0
#endif

#if VAL1 || UNDEF
#error good 1
#else
#error bad 1
#endif

#if VAL1 && UNDEF // UNDEF ERROR
#endif

#if VAL0 || UNDEF // UNDEF ERROR
#endif

#if VAL0 && UNDEF
#error bad 2
#else
#error good 1
#endif

#if VAL1 || (VAL1 && UNDEF)
#error good 3
#else
#error bad 3
#endif

#if VAL1 && (VAL1 || UNDEF)
#error good 4
#else
#error bad 4
#endif

#if VAL1 < VAL1 || VAL1 > VAL1 || UNDEF // UNDEF ERROR
#endif

#if VAL1 < VAL1 || VAL1 > VAL1 && UNDEF
#endif

#if VAL1 || UNDEF && UNDEF2
#endif

#if VAL0 || UNDEF && UNDEF2  // UNDEF ERROR
#endif

#if (VAL1 || UNDEF) && UNDEF2 // UNDEF2 ERROR
#endif

#if (VAL0 && UNDEF) || UNDEF2 // UNDEF2 ERROR
#endif

#line 3000
#error line of this error should be 3000
    
#define __LINE__ 30
#define __FILE__
#define __VERSION__
#define GL_SOME_EXTENSION
#undef __LINE__
#undef __FILE__
#undef __VERSION__
#undef GL_SOME_EXTENSION

#line 4000
#line 200 % 0     // ERROR, div by 0
#if __LINE__ / 0  // ERROR, div by 0
#endif

#if 7%            // ERROR incomplete expression

#line 10000
#if 0
// ERROR, EOF