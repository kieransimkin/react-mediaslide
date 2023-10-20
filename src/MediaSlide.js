
import PropTypes from 'prop-types';
import { useEffect, useRef } from 'react';
import * as React from "react";
import { version } from  '../package.json'

const MediaSlide = (props) => { 
    const {
        gallery
    } = props;

    return (
        <>
            Hello from MediaSlide 2
        </>
    );
}

MediaSlide.propTypes = {
   gallery: PropTypes.array.isRequired
};
export default MediaSlide;