exports.dividerBlock = {
    type: "divider",
};

exports.markdownSection = (textForSection) => {
    return {
        type: "section",
        text: {
            type: "mrkdwn",
            text: textForSection,
        },
    };
};

exports.formatField = (fieldName, text) => {
    return `*${fieldName}:* ${text}`;
};

exports.homeView = (text, blockArray) => {
    return {
        type: "home",
        title: {
            type: "plain_text",
            text: text,
        },
        blocks: blockArray,
    };
};

exports.markdownElement = (text) => {
    return {
        type: "mrkdwn",
        text: text
    };
}

exports.context = (elements) => {
    return {
        type: 'context',
        elements: elements,
    };
};

exports.modalView = (callbackId, titleText, privateMetadata, bkBlocks, submitText, submittable) => {
    if (submittable === undefined) {
        submittable = true;
    }
    var modalView = {
        type: "modal",
        // View identifier
        callback_id: callbackId,
        title: {
            type: "plain_text",
            text: titleText,
        },
        blocks: bkBlocks,
    };
    if (privateMetadata) {
        modalView.private_metadata = JSON.stringify(privateMetadata);
    }
    if (submittable) {
        modalView.submit = {
            type: "plain_text",
            text: submitText,
        };
    }
    return modalView;
};

exports.selectInput = (blockId, labelText, placeholderText, actionId, options) => {
    return {
        type: "input",
        label: {
            type: "plain_text",
            text: labelText,
        },
        block_id: blockId,
        element: {
            type: "static_select",
            placeholder: {
                type: "plain_text",
                text: placeholderText,
            },
            action_id: actionId,
            options: options,
        },
    }
};

exports.textInput = (blockId, text, actionId, multiline, initialValue) => {
    if (!multiline) {
        multiline = false;
    }
    return {
        type: "input",
        block_id: blockId,
        label: {
            type: "plain_text",
            text: text,
        },
        element: {
            type: "plain_text_input",
            action_id: actionId,
            multiline: multiline,
            initial_value: initialValue,
        },
    };
};

exports.markdownSectionWithAccessoryImage = (textForSection, imageUrl, imageAltText) => {
    return {
        type: "section",
        text: {
            type: "mrkdwn",
            text: textForSection,
        },
        accessory: {
            type: "image",
            image_url: imageUrl,
            alt_text: imageAltText,
        },
    };
};

exports.markdownSectionWithAccessoryButton = (textForSection, buttonText, buttonActionId) => {
    return {
        type: "section",
        text: {
            type: "mrkdwn",
            text: textForSection,
        },
        accessory: {
            type: "button",
            text: {
                type: "plain_text",
                text: buttonText,
            },
            action_id: buttonActionId,
        },
    };
};

exports.option = (text, value) => {
    return {
        text: {
            type: 'plain_text',
            text: text,
            emoji: true,
        },
        value: value
    };
};

exports.markdownSectionWithOverflow = (textForSection, blockId, accessoryActionId, overflowOptions) => {
    return {
        type: 'section',
        block_id: blockId,
        text: {
            type: 'mrkdwn',
            text: textForSection,
        },
        accessory: {
            type: 'overflow',
            action_id: accessoryActionId,
            options: overflowOptions
        }
    };
};

exports.markdownWithFieldsSection = (arrayOfTextFields) => {
    let arrayFields = [];
    arrayOfTextFields.forEach(fieldText => {
        arrayFields.push({
            type: "mrkdwn",
            text: fieldText,
        });
    });
    return {
        type: "section",
        fields: arrayFields,
    };
};

exports.buttonAction = (blockId, buttonText, actionId, buttonStyle) => {
    if (!buttonStyle) {
        buttonStyle = 'primary';
    }
    return {
        type: "actions",
        block_id: blockId,
        elements: [{
            type: "button",
            text: {
                type: "plain_text",
                emoji: true,
                text: buttonText,
            },
            style: buttonStyle,
            action_id: actionId,
        },],
    }
}

exports.divider = () => {
    return {
        type: "divider"
    }
}