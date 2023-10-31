
import PropTypes from 'prop-types';
import { useEffect, useRef } from 'react';
import * as React from "react";
import { version } from  '../package.json'


const itemHTML = (item) => { 
    return <li><img src={item.thumb} width="200" />{item.title}</li>
}
const MediaSlide = (props) => { 
    const {
        gallery
    } = props;

    let items;
    if (gallery) { 
        if (gallery.length<1) { 
            items=<h1>Not found</h1>
        } else { 
            items = <ul>{gallery.map(itemHTML)}</ul>
        }
    } else { 
        items = <h1>Loading</h1>
    }
    
    return (
        <>
            {items};
        </>
    );
}

MediaSlide.propTypes = {
   gallery: PropTypes.array.isRequired
};
export default MediaSlide;