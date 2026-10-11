import numpy as np
import tensorflow as tf
from keras.models import load_model
import cv2   #读取图片

CLASS_NAME=np.array(['','','','','','',''])

IMG_HEIGHT=32
IMG_WIDTH=32

#加载模型

model=load_model('model.h5')
#数据读取与预处理
src=cv2.imread('1.jpg')

src=cv2.resize(src,(IMG_WIDTH,IMG_HEIGHT))
src=src.astype('int32')
src=src/255
#思维数据 批次 长 宽 通道数
test_img=tf.expand_dims(src,0)
print(test_img.shape)

#用模型预测

preds=model.predict(test_img)
print(preds)
'''
| 属性     | 说明                         |
| :----- | :------------------------- |
| **类型** | NumPy 数组 (`numpy.ndarray`) |
| **形状** | `(1, 7)` → 1张图片，7个类别的概率    |
| **数值** | 每个类别的**置信度/概率**（0~1之间）     |
| **总和** | 约等于 1.0（softmax 输出）        |

'''
#preds 是一个数组 每一张图每一个类别对应的概率

score=preds[0]
# score 现在是一维数组  第一张图片的概率数组
print(score)
#取概率最大对应的类别作为预测结果

print('模型预测的结果为：{},概率为{}'
      .format(CLASS_NAME[np.argmax(score)],np.max(score)))

