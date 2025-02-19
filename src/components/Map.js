import React, { Component } from 'react';
import mapboxgl from 'mapbox-gl';
import NY_Districts from './../geoJSON/NY_district.geojson'
import PA_Districts from './../geoJSON/PA_district.geojson'
import MD_Districts from './../geoJSON/MD_district.geojson'
import NY_Precincts from './../geoJSON/NY_normalized.geojson'
import PA_Precincts from './../geoJSON/PA_normalized.geojson'
import MD_Precincts from './../geoJSON/MD_normalized.geojson'
import '../App.css';
const clonedeep = require('lodash/cloneDeep');


class Map extends Component {

    constructor(props) {
        super(props);

        mapboxgl.accessToken = 'pk.eyJ1IjoidmFzZWdvZCIsImEiOiJja2ZiZXNnOHQxMXI1MnRvOG1yY25icHZrIn0.8eLTRoe92V02KENueM7PqQ';
        this.map = null;
        this.imports = [];
        this.state = {
            geoLevel: 'Districts',
            appliedLayers: [],
            lng: -107,
            lat: 39,
            zoom: 3.5,
        }
    }

    componentDidMount() {
        this.map = new mapboxgl.Map({
            container: this.mapContainer,
            style: 'mapbox://styles/vasegod/ckfocvfiu02jw19kjulasl3dq',
            center: [this.state.lng, this.state.lat],
            zoom: this.state.zoom
        });

        this.map.on('load', () => {
            this.addGeoJsonLayer('NY_Precincts', NY_Precincts, "black", "none");
            this.addGeoJsonLayer('PA_Precincts', PA_Precincts, "black", "none");
            this.addGeoJsonLayer('MD_Precincts', MD_Precincts, "black", "none");
            this.addGeoJsonLayer('NY_Districts', NY_Districts, "orange", "visible");
            this.addGeoJsonLayer('PA_Districts', PA_Districts, "orange", "visible");
            this.addGeoJsonLayer('MD_Districts', MD_Districts, "orange", "visible");
        });
    }

    componentWillUnmount() {

    }

    componentDidUpdate(prevProps) {
        if (this.props.state !== prevProps.state)
            this.changeState(prevProps.state, this.props.state);

        if (JSON.stringify(this.props.filter) !== JSON.stringify(prevProps.filter))
            this.applyGeoFilter(this.props.filter, prevProps.filter);
    }

    postReqChangeState = (stateName) => {
        let state = this.stateInitials(stateName);

        fetch('http://localhost:8080/api/map/changeState',
            {
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
                method: "POST",
                body: JSON.stringify({ "state": state }),
                mode: 'cors'
            })
            .then(response => response.json())
    }

    stateInitials = (stateName) => {
        if (stateName === 'Maryland')
            return 'MD';
        else if (stateName === 'New York')
            return 'NY';
        else if (stateName === 'Pennsylvania')
            return 'PA';
        return stateName;
    }

    stateName = (stateInitials) => {
        if (stateInitials === 'MD')
            return 'Maryland';
        else if (stateInitials === 'NY')
            return 'New York';
        else if (stateInitials === 'PA')
            return 'Pennsylvania';
        return stateInitials;
    }

    addGeoJsonLayer = (sourceName, geoJSON, boundaryColor, visibility) => {
        if (this.state.appliedLayers.includes(sourceName))
            return;
        let hoveredStateId = null;

        this.map.addSource(sourceName, {
            'type': 'geojson',
            'data':
                geoJSON
        });

        // The feature-state dependent fill-opacity expression will render the hover effect
        // when a feature's hover state is set to true.
        this.map.addLayer({
            'id': sourceName + ' state-fills',
            'type': 'fill',
            'source': sourceName,
            'layout': { 'visibility': visibility },
            'paint': {
                'fill-color': sourceName.includes('districting') ? '' : '#627BC1', // #627BC1
                'fill-opacity': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    1,
                    0.5
                ]
            }
        });

        this.map.addLayer({
            'id': sourceName + ' state-borders',
            'type': 'line',
            'source': sourceName,
            'layout': { 'visibility': visibility },
            'paint': {
                'line-color': boundaryColor,
                'line-width': 2
            }
        });

        // When the user moves their mouse over the state-fill layer, we'll update the
        // feature state for the feature under the mouse.
        this.map.on('mousemove', sourceName + ' state-fills', (e) => {
            if (e.features.length > 0) {
                if (hoveredStateId) {
                    this.map.setFeatureState(
                        { source: sourceName, id: hoveredStateId },
                        { hover: false }
                    );
                }
                hoveredStateId = e.features[0].properties.GEOID10;
                this.map.setFeatureState(
                    { source: sourceName, id: hoveredStateId },
                    { hover: true }
                );

                if (this.props.state === this.stateFromGeoProps(e.features[0].properties))
                    this.props.onGeoDataUpdate(e.features[0].properties)
            }
        });

        this.map.on('click', sourceName + ' state-fills', (e) => {
            let stateName = this.stateFromGeoProps(e.features[0].properties);
            if (this.props.state !== stateName) {
                this.props.onStateSelect(stateName);
            }
        });

        // When the mouse leaves the state-fill layer, update the feature state of the
        // previously hovered feature.
        this.map.on('mouseleave', sourceName + ' state-fills', () => {
            if (hoveredStateId) {
                this.map.setFeatureState(
                    { source: sourceName, id: hoveredStateId },
                    { hover: false }
                );
            }
            hoveredStateId = null;
        });

        let appliedLayers = this.state.appliedLayers;
        appliedLayers.push(sourceName);
        this.setState({ appliedLayers: appliedLayers });
    }

    removeGeoJsonLayer(sourceName) {
        if (!this.state.appliedLayers.includes(sourceName))
            return;
        this.map.removeLayer(sourceName + ' state-fills');
        this.map.removeLayer(sourceName + ' state-borders');
        this.map.removeSource(sourceName);
        let appliedLayers = this.state.appliedLayers;
        appliedLayers.splice(appliedLayers.indexOf(sourceName), 1);
        this.setState({ appliedLayers: appliedLayers });

    }

    setVisibilty = (sourceName, visibility) => {
        this.map.setLayoutProperty(sourceName + ' state-fills', 'visibility', visibility);
        this.map.setLayoutProperty(sourceName + ' state-borders', 'visibility', visibility);
    }

    zoomTo = (state) => {
        if (state === 'New York')
            this.map.flyTo({
                center: [-78.000, 42.850],
                zoom: 6,
                essential: true
            });
        else if (state === 'Pennsylvania')
            this.map.flyTo({
                center: [-79.15, 41.100],
                zoom: 6.8,
                essential: true
            });
        else if (state === 'Maryland')
            this.map.flyTo({
                center: [-78.100, 38.9],
                zoom: 7.25,
                essential: true
            });
        else
            this.map.flyTo({
                center: [-107, 39],
                zoom: 3.5,
                essential: true
            });
    }

    getGeoJsonFile = (fileName) => {
        switch (fileName) {
            case 'MD_Districts':
                return MD_Districts;
            case 'NY_Districts':
                return NY_Districts;
            case 'PA_Districts':
                return PA_Districts
            case 'MD_Precincts':
                return MD_Precincts;
            case 'NY_Precincts':
                return NY_Precincts;
            case 'PA_Precincts':
                return PA_Precincts;
            default:
                return;
        }
    }

    applyGeoFilter = (filter, prevFilter) => {
        let appliedLayers = this.state.appliedLayers;
        let stateInitials = this.stateInitials(this.props.state);
        let districts = stateInitials + '_Districts';
        let precincts = stateInitials + '_Precincts';
        let heatmap = stateInitials + '_Heatmap';

        console.log(filter);

        if (!filter.Districts)
            this.setVisibilty(districts, "none");
        else if (filter.Districts)
            this.setVisibilty(districts, "visible");

        if (!filter.Precincts) {
            this.setVisibilty(precincts, "none");
            if (filter.Districts)
                this.map.setLayoutProperty(districts + ' state-fills', 'visibility', 'visible');
        }
        else if (filter.Precincts) {
            this.setVisibilty(precincts, "visible");
            if (filter.Districts)
                this.map.setLayoutProperty(districts + ' state-fills', 'visibility', 'none');
        }

        // Heatmap filter logic
        if (!filter.Heatmap.show && appliedLayers.includes(heatmap))
            this.removeGeoJsonLayer(heatmap);
        else if (filter.Heatmap.show && !appliedLayers.includes(heatmap))
            this.addHeatMap(heatmap, this.getGeoJsonFile(precincts), filter.Heatmap.colorRange, filter.Heatmap.popType);
        else if (filter.Heatmap.show && appliedLayers.includes(heatmap))
            this.updateHeatMapCriteria(heatmap, filter.Heatmap)


        if (prevFilter.Districting.importStatus === 'success' && filter.Districting.importStatus === '') {
            this.removeGeoJsonLayer('average districting');
            this.removeGeoJsonLayer('random districting');
            this.removeGeoJsonLayer('extreme districting');
        }

        if (filter.Districting.job.value !== 'Select...' && filter.Districting.importStatus === '') {
            let jobObj = filter.Districting.jobObj;
            let random = 'jobID' + jobObj.jobId + '_' + jobObj.state + '_random_districting';
            let average = 'jobID' + jobObj.jobId + '_' + jobObj.state + '_average_districting';
            let extreme = 'jobID' + jobObj.jobId + '_' + jobObj.state + '_extreme_districting';

            fetch('http://localhost:8080/api/job/getSummaryFile',
                {
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*"
                    },
                    method: "POST",
                    body: JSON.stringify(filter.Districting.jobObj),
                    mode: 'cors'
                })
                .then(response => response)
                .then(response => {
                    import(`./../geoJSON/${random}.geojson`).then(({ default: data }) => this.addGeoJsonLayer('random districting', data, filter.Districting.color.random, "none"));
                    import(`./../geoJSON/${average}.geojson`).then(({ default: data }) => this.addGeoJsonLayer('average districting', data, filter.Districting.color.avg, "none"));
                    import(`./../geoJSON/${extreme}.geojson`).then(({ default: data }) => {
                        this.addGeoJsonLayer('extreme districting', data, filter.Districting.color.extreme, "none")
                        let filterUpdate = clonedeep(this.props.filter);
                        filterUpdate.Districting.importStatus = 'success';
                        this.props.updateFilter(filterUpdate);
                    });
                });
        }
        if (filter.Districting.importStatus === 'success') {
            this.setVisibilty('average districting', filter.Districting.avg ? "visible" : "none");
            this.setVisibilty('random districting', filter.Districting.random ? "visible" : "none");
            this.setVisibilty('extreme districting', filter.Districting.extreme ? "visible" : "none");
        }



    }

    updateHeatMapCriteria = (sourceName, criteria) => {
        let mapColorRange = [
            'interpolate',
            ['linear'],
            ['var', 'density'],
            274,
            ['to-color', criteria.colorRange.low], // '#001769'
            638,
            ['to-color', criteria.colorRange.avg],
            1551,
            ['to-color', criteria.colorRange.high]
        ];

        if (criteria.colorRange.avg === '') {
            mapColorRange.splice(5, 2);
        }

        this.map.setPaintProperty(sourceName + ' state-fills', 'fill-color',
            [
                'let',
                'density',
                criteria.popType.value !== "MTOT" ? ['/', ['get', criteria.popType.value], 1] : ['-', ['get', 'TOTAL'], ['get', 'WTOT']],
                [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    8,
                    mapColorRange
                ]
            ]
        );
    }

    addHeatMap = (sourceName, geoJSON, colorRange, popType) => {

        if (this.state.appliedLayers.includes(sourceName))
            return;
        let hoveredStateId = null;

        this.map.addSource(sourceName, {
            'type': 'geojson',
            'data':
                geoJSON
        });

        let mapColorRange = [
            'interpolate',
            ['linear'],
            ['var', 'density'],
            274,
            ['to-color', colorRange.low], // '#001769'
            638,
            ['to-color', colorRange.avg],
            1551,
            ['to-color', colorRange.high]
        ];

        if (colorRange.avg === '') {
            mapColorRange.splice(5, 2);
        }

        // The feature-state dependent fill-opacity expression will render the hover effect
        // when a feature's hover state is set to true.
        this.map.addLayer({
            'id': sourceName + ' state-fills',
            'type': 'fill',
            'source': sourceName,
            'layout': {},
            'paint': {
                'fill-color': [
                    'let',
                    'density',
                    popType.value !== "MTOT" ? ['/', ['get', popType.value], 1] : ['-', ['get', 'TOTAL'], ['get', 'WTOT']],
                    [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        8,
                        mapColorRange,
                    ]
                ],
                'fill-opacity': 0.75
            },
        });

        this.map.addLayer({
            'id': sourceName + ' state-borders',
            'type': 'line',
            'source': sourceName,
            'layout': {},
            'paint': {
                'line-color': 'white',
                'line-width': 0.2
            }
        });

        // When the user moves their mouse over the state-fill layer, we'll update the
        // feature state for the feature under the mouse.
        this.map.on('mousemove', sourceName + ' state-fills', (e) => {
            if (e.features.length > 0) {
                if (hoveredStateId) {
                    this.map.setFeatureState(
                        { source: sourceName, id: hoveredStateId },
                        { hover: false }
                    );
                }
                hoveredStateId = e.features[0].properties.GEOID10;
                this.map.setFeatureState(
                    { source: sourceName, id: hoveredStateId },
                    { hover: true }
                );

                if (this.props.state === this.stateFromGeoProps(e.features[0].properties))
                    this.props.onGeoDataUpdate(e.features[0].properties)
            }
        });

        this.map.on('click', sourceName + ' state-fills', (e) => {
            let stateName = this.stateFromGeoProps(e.features[0].properties);
            if (this.props.state !== stateName) {
                this.props.onStateSelect(stateName);
            }
        });

        // When the mouse leaves the state-fill layer, update the feature state of the
        // previously hovered feature.
        this.map.on('mouseleave', sourceName + ' state-fills', () => {
            if (hoveredStateId) {
                this.map.setFeatureState(
                    { source: sourceName, id: hoveredStateId },
                    { hover: false }
                );
            }
            hoveredStateId = null;
        });

        let appliedLayers = this.state.appliedLayers;
        appliedLayers.push(sourceName);
        this.setState({ appliedLayers: appliedLayers });
    }

    changeState = (currentState, requestState) => {
        this.postReqChangeState(requestState);

        let currentStateInitials = this.stateInitials(currentState);
        let requestStateInitials = this.stateInitials(requestState);

        if (currentState !== 'Select...') {
            this.setVisibilty(currentStateInitials + '_Districts', "visible");
            this.setVisibilty(currentStateInitials + '_Precincts', "none");
        }

        if (requestState !== 'Select...') {
            this.setVisibilty(requestStateInitials + '_Precincts', "visible");
            this.setVisibilty(requestStateInitials + '_Districts', "none");
        }

        this.removeGeoJsonLayer(currentStateInitials + '_Heatmap')

        this.props.resetFilter();
        this.zoomTo(requestState);
    }

    stateFromGeoProps(properties) {
        let state = properties.statename;
        if (state === undefined)
            state = properties.STATE;
        if (state.length > 2)
            return state;
        return this.stateName(state);
    }

    render() {
        let boxStyle = { width: '30px', height: '18px', border: 'solid', borderWidth: '0.2px' };
        let heatMapColorRange = [];
        
        if (this.props.filter.Heatmap.show) {
            let colorRange = this.props.filter.Heatmap.colorRange;
            let numBoxes = 11;
            let center = parseInt(numBoxes / 2);
            if (colorRange.avg !== '') {
                for (let i = 0; i < numBoxes; i++) {
                    heatMapColorRange.push(
                        <div style={{ display: 'flex', flexDirection: 'row', height: '100%', width: '100%', margin: '1%' }}>
                            <div style={boxStyle}>
                                <div style={{
                                    width: '100%', height: '100%', opacity: Math.abs(1 - (.20 * i)) * .75,
                                    background: i === center ? colorRange.avg : i < center ? colorRange.low : colorRange.high
                                }} />
                            </div>
                            <div style={{ fontFamily: 'monospace', marginLeft: '4%' }}>
                                {i === center ? 'avg' : `avg ${i > center ? '+' : '-'} ` + Math.abs(100 - (20 * i)) + '%'}
                            </div>
                        </div>
                    );
                }
            }
            else {
                for (let i = 0; i < 10; i++) {
                    heatMapColorRange.push(
                        <div style={{ display: 'flex', flexDirection: 'row', height: '100%', width: '100%', margin: '1%' }}>
                            <div style={boxStyle}>
                                <div style={{
                                    width: '100%', height: '100%', opacity: (i + 1) / 11 * .75,
                                    background: colorRange.high
                                }} />
                            </div>
                            <div style={{ fontFamily: 'monospace', marginLeft: '4%' }}>
                                {`${i * 10}% - ${i * 10 + 10}%`}
                            </div>
                        </div>
                    );
                }
            }
        }

        let legendStyle = {
            zIndex: 1, width: '10%', position: 'absolute', borderRadius: '3%',
            bottom: '1%', left: this.props.showSideBar ? '25.5%' : '0.5%', padding: '0.5%', background: '#ebf3f5', border: 'solid', borderWidth: '2px'
        }

        let boundaryLabelStyle = { textAlign: 'start' };

        return (
            <>
                <div style={this.props.style}
                    ref={el => this.mapContainer = el} />

                <div style={legendStyle}>
                    <div style={{
                        width: '100%',
                        height: '100%',
                        fontFamily: 'monospace'
                    }}>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            width: '100%',
                            height: '100%',
                        }}>
                            {heatMapColorRange}

                            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={boundaryLabelStyle}>
                                        Enacted
                                        <div style={{ padding: '2%', background: 'orange' }} />
                                    </div>
                                    <div style={boundaryLabelStyle}>
                                        Random
                                        <div style={{ padding: '2%', background: 'red' }} />
                                    </div>
                                    <div style={boundaryLabelStyle}>
                                        Precincts
                                        <div style={{ padding: '2%', background: 'black' }} />
                                    </div>
                                </div>
                                <div>
                                    <div style={boundaryLabelStyle}>
                                        Average
                                        <div style={{ padding: '2.5%', background: 'green' }} />
                                    </div>
                                    <div style={boundaryLabelStyle}>
                                        Extreme
                                        <div style={{ padding: '2.5%', background: 'purple' }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </>


        );
    }
}

export default Map;
