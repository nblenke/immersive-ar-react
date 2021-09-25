import React from 'react'
import './App.css'
import * as THREE from 'three'
// import WebXRPolyfill from 'webxr-polyfill'

import styled from 'styled-components'

const Foot = styled.div`
    position fixed;
    height: 50px;
    width: 100vw;
    padding: 10px;
    bottom: 0;
`

const {xr} = navigator

function App() {
    // TODO: Geolocation
    // const [coords, setCoords] = React.useState({})
    // const init = async () => {
    //     navigator.geolocation.getCurrentPosition(
    //         (pos) => {
    //             const coords = pos.coords
    //
    //             setCoords({
    //                 lat: coords.latitude,
    //                 lon: coords.longitude,
    //             })
    //
    //             console.log(`==coords ${coords.latitude} ${coords.longitude}`)
    //         },
    //         (err) => {
    //             console.warn(`ERROR(${err.code}): ${err.message}`)
    //         }
    //     )
    // }
    // React.useEffect(() => {
    //     init()
    // }, [])

    const activateXR = async () => {
        const immersiveOK = await xr.isSessionSupported('immersive-ar')

        if (!immersiveOK) {
            return
        }
        // Add a canvas element and initialize a WebGL context that is compatible with WebXR.
        const canvas = document.getElementById('canvas')
        const gl = canvas.getContext('webgl', {xrCompatible: true})
        const scene = new THREE.Scene()

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3)
        directionalLight.position.set(10, 15, 10)
        scene.add(directionalLight)

        const particleLight = new THREE.Mesh(
            new THREE.SphereGeometry(4, 8, 8),
            new THREE.MeshBasicMaterial({color: 0xffffff})
        )
        scene.add(particleLight)

        // Set up the WebGLRenderer, which handles rendering to the session's base layer.
        const renderer = new THREE.WebGLRenderer({
            alpha: true,
            preserveDrawingBuffer: true,
            canvas: canvas,
            context: gl,
        })
        renderer.autoClear = false

        // The API directly updates the camera matrices.
        // Disable matrix auto updates so three.js doesn't attempt
        // to handle the matrices independently.
        const camera = new THREE.PerspectiveCamera()
        camera.matrixAutoUpdate = false

        // Initialize a WebXR session using "immersive-ar".
        // const session = await xr.requestSession('immersive-ar')
        const session = await xr.requestSession('immersive-ar', {
            requiredFeatures: ['hit-test'],
            optionalFeatures: ['dom-overlay'],
            domOverlay: {
                root: document.getElementById('xr-overlay'),
            },
        })
        session.updateRenderState({
            baseLayer: new window.XRWebGLLayer(session, gl),
        })

        // A 'local' reference space has a native origin that is located
        // near the viewer's position at the time the session was created.
        const referenceSpace = await session.requestReferenceSpace('local') // local

        // Create another XRReferenceSpace that has the viewer as the origin.
        const viewerSpace = await session.requestReferenceSpace('viewer')
        // Perform hit testing using the viewer as origin.
        const hitTestSource = await session.requestHitTestSource({
            space: viewerSpace,
        })

        const cubeGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2)
        const cubeMaterial = new THREE.MeshBasicMaterial({color: 0x00ff00})
        const cube = new THREE.Mesh(cubeGeometry, cubeMaterial)

        const reticleGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2)
        const reticleMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
        })
        const reticle = new THREE.Mesh(reticleGeometry, reticleMaterial)
        reticle.visible = true
        scene.add(reticle)

        session.addEventListener('select', (event) => {
            if (cube) {
                const clone = cube.clone()
                clone.position.copy(reticle.position)
                scene.add(clone)
            }
        })

        // Create a render loop that allows us to draw on the AR view.
        const onXRFrame = (time, frame) => {
            // Queue up the next draw request.
            session.requestAnimationFrame(onXRFrame)

            // Bind the graphics framebuffer to the baseLayer's framebuffer
            gl.bindFramebuffer(
                gl.FRAMEBUFFER,
                session.renderState.baseLayer.framebuffer
            )

            // Retrieve the pose of the device.
            // XRFrame.getViewerPose can return null while the session attempts to establish tracking.
            const pose = frame.getViewerPose(referenceSpace)
            if (pose) {
                // In mobile AR, we only have one view.
                const view = pose.views[0]

                const viewport = session.renderState.baseLayer.getViewport(view)
                renderer.setSize(viewport.width, viewport.height)

                // Use the view's transform matrix and projection matrix to configure the THREE.camera.
                camera.matrix.fromArray(view.transform.matrix)
                camera.projectionMatrix.fromArray(view.projectionMatrix)
                camera.updateMatrixWorld(true)

                const hitTestResults = frame.getHitTestResults(hitTestSource)
                if (hitTestResults.length > 0 && reticle) {
                    const hitPose = hitTestResults[0].getPose(referenceSpace)
                    reticle.visible = true
                    reticle.position.set(
                        hitPose.transform.position.x,
                        hitPose.transform.position.y,
                        hitPose.transform.position.z
                    )
                    reticle.updateMatrixWorld(true)
                }

                // Render the scene with THREE.WebGLRenderer.
                renderer.render(scene, camera)
            }
        }
        session.requestAnimationFrame(onXRFrame)
    }

    return (
        <div className="App">
            <div>
                <canvas id="canvas" />
            </div>
            <Foot id="xr-overlay">
                <button
                    onClick={() => {
                        window.location.reload()
                    }}
                >
                    RELOAD
                </button>
            </Foot>

            <button onClick={() => activateXR()}>START</button>
        </div>
    )
}

export default App
