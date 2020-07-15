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
}

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

exports.overflowOption = (text, value) => {
    return {
        text: {
            type: 'plain_text',
            text: text,
        },
        value: value
    };
};

exports.markdownSectionWithOverflow = (textForSection, blockId, accessoryActionId, overflowOptions) => {
    return {
        type: 'section',
        block_id: 'bet_action',
        text: {
            type: 'mrkdwn',
            text: bet.scenarioText,
        },
        accessory: {
            type: 'overflow',
            action_id: 'bet_action_from_channel',
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