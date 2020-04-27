import {css, customElement, html, LitElement, property, PropertyValues, query, unsafeCSS} from "lit-element";
import {OrTranslate, translate} from "@openremote/or-translate";
import {classMap} from "lit-html/directives/class-map";

import i18next from "i18next";
import {Asset, AssetAttribute, DatapointInterval, ValueDatapoint, ValueType} from "@openremote/model";
import {manager,
    DefaultColor2,
    DefaultColor3,
    DefaultColor4,
    DefaultColor5} from "@openremote/core";
import Chart, {ChartTooltipCallback} from "chart.js";
import {OrAttributeHistoryEvent} from "@openremote/or-attribute-history";

// language=CSS
const style = css`
    
    :host {
        width: 100%;
        
        --internal-or-attribute-history-graph-line-color: var(--or-attribute-history-graph-line-color, var(--or-app-color4, ${unsafeCSS(DefaultColor4)}));       
    }
    
    :host([hidden]) {
        display: none;
    }
    
    .panel {
        background-color: var(--internal-or-asset-viewer-panel-color);     
        border: 1px solid #e5e5e5;
        border-radius: 5px;
        max-width: 100%;
        position: relative;
    }
    
    .panel-content-wrapper {
        padding: var(--internal-or-asset-viewer-panel-padding);
    }
    
    .panel-content {
        display: flex;
        flex-wrap: wrap;
    }
        
    .panel-title {
        text-transform: uppercase;
        font-weight: bolder;
        line-height: 1em;
        color: var(--internal-or-asset-viewer-title-text-color);
        margin-bottom: 25px;
        flex: 0 0 auto;
    }
`;

@customElement("or-attribute-card")
export class OrAttributeCard extends LitElement {

    @property()
    public assetId: string = "";

    @property()
    public attributeName: string = "";

    @property()
    private cardTitle: string = "";

    @property()
    private assetName: string = "";

    @property()
    private data: ValueDatapoint<any>[] = [];

    @query("#chart")
    private _chartElem!: HTMLCanvasElement;
    private _chart?: Chart;
    private _style!: CSSStyleDeclaration;

    static get styles() {
        return [
            style
        ];
    }

    connectedCallback() {
        super.connectedCallback();
        this._style = window.getComputedStyle(this);
        this.getData();
    }

    updated(changedProperties: PropertyValues) {
        super.updated(changedProperties);

        if (!this.data) {
            return;
        }

        this._chart = new Chart(this._chartElem, {
            type: "line",
            data: {
                datasets: [
                    {
                        data: this.data,
                        spanGaps: true,
                        backgroundColor: "transparent",
                        borderColor: this._style.getPropertyValue("--internal-or-attribute-history-graph-line-color"),
                        pointBorderColor: "transparent",
                    }
                ]
            },
            options: {
                onResize: () => this.dispatchEvent(new OrAttributeHistoryEvent("resize")),
                legend: {
                    display: false
                },
                tooltips: {
                    displayColors: false,
                    callbacks: {
                        label: (tooltipItem, data) => {
                            return tooltipItem.yLabel; // Removes the colon before the label
                        },
                        footer: () => {
                            return " "; // Hack the broken vertical alignment of body with footerFontSize: 0
                        }
                    } as ChartTooltipCallback
                },
                scales: {
                    yAxes: [{
                        display: false
                    }],
                    xAxes: [{
                        type: "time",
                        display: false,
                    }]
                }
            }
        });
        if (changedProperties.has("data")) {
            this._chart.data.datasets![0].data = this.data;
            this._chart.update();
        }

    }

    protected render() {

        if (this.assetId === "" || this.attributeName === "") {
            return html`
                <div class="panel">
                    <div class="panel-content-wrapper">
                        <div class="panel-title">
                            <or-translate value="error"></or-translate>
                        </div>
                        <div class="panel-content">
                            <or-translate value="attributeNotFound"></or-translate>
                        </div>
                    </div>
                </div>
            `;
        }

        return html`
            <div class="panel" id="attribute-card">
                <div class="panel-content-wrapper">
                    <div class="panel-title">
                        ${this.assetName} - ${i18next.t(this.attributeName)}
                    </div>
                    <div class="panel-content">
                        <canvas id="chart"></canvas>
                    </div>
                </div>
            </div>
        `;
    }

    protected async getAssetById(id: string): Promise<Asset> {
        const response = await manager.rest.api.AssetResource.queryAssets({
            ids: [id],
            recursive: false
        });

        if (response.status !== 200 || !response.data) {
            return {};
        }

        return response.data[0];
    }

    protected async getDatapointsByAttribute(id: string): Promise<ValueDatapoint<any>[]> {
        const response = await manager.rest.api.AssetDatapointResource.getDatapoints(
            id,
            this.attributeName,
            {
                interval: DatapointInterval.DAY,
                fromTimestamp: 1585692000000,
                toTimestamp: 1588283999999
            }
        );

        if (response.status !== 200 || !response.data) {
            return [];
        }

        return this.sanitizeDataPoints(response.data);
    }

    protected getData = () => {
        this.getAssetById(this.assetId)
            .then((data) => {
                this.assetName = data.name || "";
                return this.getDatapointsByAttribute(data.id!);
            })
            .then((datapoints: ValueDatapoint<any>[]) => {
                this.data = datapoints || [];
            });
    }

    protected sanitizeDataPoints(data: ValueDatapoint<any>[]): ValueDatapoint<any>[] {

        // if there's no measurement for the first data point in time, assume 0
        if (data[0] && !data[0].y) {
            data[0].y = 0;
        }

        return data;
    }

}