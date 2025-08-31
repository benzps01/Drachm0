import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedProps,
    withTiming,
    withDelay,
    runOnJS,
    Easing,
} from 'react-native-reanimated';
import Svg, { Path, Defs, Mask, Text, Circle, G, Image as SvgImage } from 'react-native-svg';

// Component styles
const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1E1E1E',
    },
});

// Define SVG size and properties
const SVG_SIZE = 300;
const CENTER = SVG_SIZE / 2;
const RADIUS = SVG_SIZE / 2 - 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Function to create points for variable width brush stroke
const createBrushStrokePath = () => {
    const points = [];
    const innerPoints = [];
    const steps = 180;

    for (let i = 0; i <= steps; i++) {
        const angle = (240 + (i / steps) * 360) * Math.PI / 180;

        // Opacity for fade in/out
        let opacity = 1;
        if (i < steps * 0.1) opacity = i / (steps * 0.1);
        else if (i > steps * 0.9) opacity = (steps - i) / (steps * 0.1);

        // Variable stroke width
        let width = 2;
        const normalizedPos = i / steps;
        if (normalizedPos >= 0.15 && normalizedPos <= 0.35) {
            const thickFactor = 1 - Math.abs(normalizedPos - 0.25) / 0.1;
            width = 2 + (thickFactor * 6);
        } else if (normalizedPos > 0.1 && normalizedPos < 0.4) {
            width = 4;
        }

        width *= Math.pow(opacity, 0.3);

        const x = CENTER + RADIUS * Math.cos(angle);
        const y = CENTER + RADIUS * Math.sin(angle);

        const outerX = CENTER + (RADIUS + width) * Math.cos(angle);
        const outerY = CENTER + (RADIUS + width) * Math.sin(angle);
        const innerX = CENTER + (RADIUS - width) * Math.cos(angle);
        const innerY = CENTER + (RADIUS - width) * Math.sin(angle);

        points.push([outerX, outerY]);
        innerPoints.unshift([innerX, innerY]);
    }

    let pathData = `M ${points[0][0]} ${points[0][1]}`;
    for (let i = 1; i < points.length; i++) {
        const cp1x = points[i - 1][0] + (points[i][0] - points[i - 1][0]) * 0.3;
        const cp1y = points[i - 1][1] + (points[i][1] - points[i - 1][1]) * 0.3;
        const cp2x = points[i][0] - (points[i][0] - points[i - 1][0]) * 0.3;
        const cp2y = points[i][1] - (points[i][1] - points[i - 1][1]) * 0.3;
        pathData += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${points[i][0]} ${points[i][1]}`;
    }

    pathData += ` L ${innerPoints[0][0]} ${innerPoints[0][1]}`;
    for (let i = 1; i < innerPoints.length; i++) {
        const cp1x = innerPoints[i - 1][0] + (innerPoints[i][0] - innerPoints[i - 1][0]) * 0.3;
        const cp1y = innerPoints[i - 1][1] + (innerPoints[i][1] - innerPoints[i - 1][1]) * 0.3;
        const cp2x = innerPoints[i][0] - (innerPoints[i][0] - innerPoints[i - 1][0]) * 0.3;
        const cp2y = innerPoints[i][1] - (innerPoints[i][1] - innerPoints[i - 1][1]) * 0.3;
        pathData += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${innerPoints[i][0]} ${innerPoints[i][1]}`;
    }

    pathData += ' Z';
    return pathData;
};

// Animated components
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const SplashScreen = ({ onAnimationComplete }) => {
    const strokeProgress = useSharedValue(0);
    const textOpacity = useSharedValue(0);
    const textTranslateY = useSharedValue(20);

    const handleAnimationComplete = React.useCallback(() => {
        if (onAnimationComplete) {
            onAnimationComplete();
        }
    }, [onAnimationComplete]);

    useEffect(() => {
        strokeProgress.value = withDelay(
            200,
            withTiming(1, { duration: 5000, easing: Easing.inOut(Easing.ease) }, (finished) => {
                if (finished) runOnJS(handleAnimationComplete)();
            })
        );

        textOpacity.value = withDelay(500, withTiming(1, { duration: 1500 }));
        textTranslateY.value = withDelay(500, withTiming(0, { duration: 1500 }));
    }, [handleAnimationComplete]);

    const animatedMaskProps = useAnimatedProps(() => ({
        strokeDashoffset: CIRCUMFERENCE * (1 - strokeProgress.value),
    }));

    const animatedTextProps = useAnimatedProps(() => ({
        opacity: textOpacity.value,
        translateY: textTranslateY.value,
    }));

    return (
        <View style={styles.container}>
            <Svg width={SVG_SIZE} height={SVG_SIZE} viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}>
                <Defs>
                    <Mask id="drawingMask">
                        <AnimatedCircle
                            cx={CENTER}
                            cy={CENTER}
                            r={RADIUS + 10}
                            stroke="white"
                            strokeWidth={25}
                            fill="none"
                            strokeDasharray={CIRCUMFERENCE}
                            animatedProps={animatedMaskProps}
                            strokeLinecap="round"
                            transform={`rotate(150, ${CENTER}, ${CENTER})`}
                        />
                    </Mask>
                </Defs>

                {/* Brush stroke path */}
                <AnimatedPath d={createBrushStrokePath()} fill="white" mask="url(#drawingMask)" />

                {/* Group with text + owl */}
                <AnimatedG animatedProps={animatedTextProps}>
                    {/* Large faded Rupee symbol */}
                    <Text
                        x={CENTER}
                        y={CENTER + 70}
                        dominantBaseline="central"
                        textAnchor="middle"
                        fontSize="260"
                        fill="white"
                        opacity="0.07"
                        fontFamily="sans-serif"
                        fontWeight="bold"
                    >
                        ₹
                    </Text>

                    {/* Owl logo centered above DrachmO */}
                    <SvgImage
                        x={CENTER - 20} // 40px wide image
                        y={CENTER - 60} // slightly above the text
                        width={65}
                        height={65}
                        href={require('../../../assets/owl_logo.png')}
                    />

                    {/* DrachmO text */}
                    <Text
                        x={CENTER}
                        y={CENTER + 40} // below owl
                        fill="#FFFFFF"
                        fontSize="45"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontFamily="Roboto"
                        fontWeight="300"
                        letterSpacing="2"
                    >
                        DRACHMO
                    </Text>
                </AnimatedG>
            </Svg>
        </View>
    );
};

export default SplashScreen;
