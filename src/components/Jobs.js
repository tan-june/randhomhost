import React, { Component } from 'react';
import Job from './Job'

class Jobs extends Component {

    constructor(props) {
        super(props);
    }


    render() {
        const style = { 
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column',
            height: '100%', 
            width: '100%', 
        };

        let jobs = this.props.jobs.filter((job) => job.jobStatus !== 'CANCELLED');

        return (
            <div style={style}>
                <button class="btn-primary" style={{width: '90%'}} onClick={this.props.getJobHistoryAndUpdateJobs}>
                    Refresh
                </button>
                {jobs.map((job) => <Job updateJobs={this.props.updateJobs} job={job} toggleModal={this.props.toggleModal}/>)}
            </div>
        );
    }
}

export default Jobs;
